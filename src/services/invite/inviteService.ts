import { decode } from 'base64-arraybuffer'
import { startOfMonth, endOfMonth } from 'date-fns'
import * as yup from 'yup'

import User, { UserManager } from '@/models/user.model'
import { WalletManager } from '@/models/wallet.model'
import { AccessLevels } from '@/models/walletAccess.model'

import { FormValidationError } from '@/services/errors'
import { CryptoService } from '@/services/crypto/cryptoService'
import { InvitePubSubService } from './invitePubSubService'
import {
  runSchemaWithFormError,
  requiredString,
  optionalString,
} from '@/utils/yupHelpers'
import { WalletPubSubService } from '@/services/wallet/walletPubSubService'

type UserInviteObject = { userInviterId: string }
type WalletInviteObject = UserInviteObject & {
  inviteId: string
  walletId: string
}
type InviteObject = WalletInviteObject | UserInviteObject

export class InviteService {
  private static inviteDelimiter = '___'
  private static inviteSchema = yup
    .object({
      userInviterId: requiredString,
      inviteId: optionalString,
      walletId: optionalString,
    })
    .noUnknown()
  private static parseInviteString(b64InviteString: string) {
    try {
      const [dataBuffer, signatureBuffer] = b64InviteString
        .split(this.inviteDelimiter)
        .map(decode)

      const decodedInvite = JSON.parse(
        Buffer.from(dataBuffer).toString('utf-8'),
      ) as InviteObject

      runSchemaWithFormError(this.inviteSchema, decodedInvite)

      return {
        dataBuffer,
        signatureBuffer,
        decodedInvite,
      }
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }
  }

  public static getCurrentMonthlyInviteUsage(userId: string) {
    const now = new Date()

    return UserManager.countInvitedBetweenDates({
      userId,
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    })
  }

  /**
   * Validates the invite string:
   * 1. signature is correct
   * 2. inviting user hasn't reached the limit in this month
   */
  private static baseInviteMonthlyLimit = 5
  static async parseAndValidateInvite(b64InviteString: string) {
    runSchemaWithFormError(requiredString, b64InviteString)

    const {
        dataBuffer,
        signatureBuffer,
        decodedInvite,
      } = this.parseInviteString(b64InviteString),
      { userInviterId: userId } = decodedInvite,
      [inviterUser, thisMonthInvitees] = await Promise.all([
        UserManager.byId(userId),
        this.getCurrentMonthlyInviteUsage(userId),
      ])

    if (!inviterUser) {
      console.log('!inviterUser')
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }

    if (
      thisMonthInvitees >=
      (inviterUser.inviteMonthlyLimit ?? this.baseInviteMonthlyLimit)
    )
      throw new FormValidationError(InviteServiceFormErrors.limitReached)

    const res = await CryptoService.verify({
      b64PublicKey: inviterUser.b64InvitePublicKey as string,
      dataBuffer,
      signatureBuffer,
    })
    if (!res) {
      console.log('!res')
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }

    return { decodedInvite, inviterUser }
  }

  private static launchWalletJoinSchema = yup
    .object({
      b64InviteSignatureByJoiningUser: requiredString,
      b64InviteString: requiredString,

      b64PublicECDHKey: requiredString,
    })
    .noUnknown()
  /**
   * Event sent by joining user when he's was first invited to the wallet.
   * Runs invite string validations and sends first notification to the wallet owner.
   */
  static async launchWalletJoin({
    joiningUser,
    b64InviteString,
    b64InviteSignatureByJoiningUser,
    b64PublicECDHKey,
  }: {
    joiningUser: User
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
    b64PublicECDHKey: string
  }) {
    runSchemaWithFormError(this.launchWalletJoinSchema, {
      b64InviteString,
      b64InviteSignatureByJoiningUser,
      b64PublicECDHKey,
    })

    const { decodedInvite, inviterUser } = await this.parseAndValidateInvite(
      b64InviteString,
    )

    if (!('walletId' in decodedInvite))
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    const wallet = await WalletManager.byId(decodedInvite.walletId)

    if (!wallet)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    for (const user of wallet.users) {
      if (user.id === joiningUser.id)
        throw new FormValidationError(InviteServiceFormErrors.alreadyMember)

      if (user.WalletAccess.inviteId === decodedInvite.inviteId)
        throw new FormValidationError(InviteServiceFormErrors.inviteAlreadyUsed)

      if (
        user.WalletAccess.accessLevel === AccessLevels.owner &&
        user.id != inviterUser.id
      )
        throw new FormValidationError(InviteServiceFormErrors.unknownError)
    }

    const devicesReached = await InvitePubSubService.requestToOwner({
      walletOwner: inviterUser,
      joiningUser,
      b64PublicECDHKey,
      b64InviteSignatureByJoiningUser,
      b64InviteString,
    })
    if (devicesReached === 0)
      throw new FormValidationError(InviteServiceFormErrors.ownerOffline)
  }

  private static checkOwnerInvitationMessageSchema = yup
    .object({
      joiningUserId: requiredString,
      b64InviteSignatureByJoiningUser: requiredString,
      b64InviteString: requiredString,
    })
    .noUnknown()
  /**
   * This method contains a bunch of checks so that some random wallet owner couldn't
   * reject/accept some other random user.
   */
  private static async checkOwnerInvitationMessage({
    walletOwner,
    joiningUserId,
    b64InviteSignatureByJoiningUser,
    b64InviteString,
  }: {
    walletOwner: User
    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
  }) {
    runSchemaWithFormError(this.checkOwnerInvitationMessageSchema, {
      joiningUserId,
      b64InviteSignatureByJoiningUser,
      b64InviteString,
    })

    const { decodedInvite } = this.parseInviteString(b64InviteString)

    if (!('walletId' in decodedInvite))
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    const [wallet, joiningUser] = await Promise.all([
      WalletManager.byId(decodedInvite.walletId),
      UserManager.byId(joiningUserId),
    ])

    if (!wallet || !joiningUser || !joiningUser.b64InvitePublicKey)
      throw new FormValidationError(InviteServiceFormErrors.unknownError)

    const dbWalletOwner = wallet.users.find(
      (user) => user.WalletAccess.accessLevel === AccessLevels.owner,
    )
    if (!dbWalletOwner || dbWalletOwner.id !== walletOwner.id)
      throw new FormValidationError(InviteServiceFormErrors.unknownError)

    const hasJoiningUserAskedToJoin = await CryptoService.verify({
      b64PublicKey: joiningUser.b64InvitePublicKey as string,
      dataBuffer: Buffer.from(b64InviteString),
      signatureBuffer: decode(b64InviteSignatureByJoiningUser),
    })
    if (!hasJoiningUserAskedToJoin)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    return { decodedInvite, wallet, joiningUser }
  }

  /**
   * Event sent by wallet owner if some of the operations failed for some reason.
   * It will inform joining user that something went wrong.
   */
  static async invitationError({
    walletOwner,
    joiningUserId,
    b64InviteSignatureByJoiningUser,
    b64InviteString,
  }: {
    walletOwner: User
    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
  }) {
    const { joiningUser, wallet } = await this.checkOwnerInvitationMessage({
      walletOwner,
      joiningUserId,
      b64InviteString,
      b64InviteSignatureByJoiningUser,
    })
    return InvitePubSubService.invitationError({
      joiningUser,
      walletId: wallet.id,
    })
  }

  private static invitationResolutionSchema = yup
    .object({
      allowJoin: yup.boolean().required(),

      b64PublicECDHKey: yup.string().when('allowJoin', {
        is: true,
        then: requiredString,
        otherwise: optionalString,
      }),
      encryptedSecretKey: yup.string().when('allowJoin', {
        is: true,
        then: requiredString,
        otherwise: optionalString,
      }),
    })
    .noUnknown()
  /**
   * Event sent by wallet owner if he makes some successful decision on allowing the user
   * to join the wallet.
   */
  static async invitationResolution({
    walletOwner,
    allowJoin,
    joiningUserId,
    b64InviteSignatureByJoiningUser,
    b64InviteString,

    b64PublicECDHKey,
    encryptedSecretKey,
  }: {
    walletOwner: User
    allowJoin: boolean
    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string

    b64PublicECDHKey?: string
    encryptedSecretKey?: string
  }) {
    runSchemaWithFormError(this.invitationResolutionSchema, {
      allowJoin,
      b64PublicECDHKey,
      encryptedSecretKey,
    })

    const {
      decodedInvite,
      joiningUser,
      wallet,
    } = await this.checkOwnerInvitationMessage({
      walletOwner,
      joiningUserId,
      b64InviteString,
      b64InviteSignatureByJoiningUser,
    })

    if (!allowJoin) {
      /**
       * 1. save rejected invite
       * 2. tell joining user about the reject
       * 3. push update about the rejection to all the wallet users
       */
      return Promise.all([
        WalletManager.addRejectedInvite(decodedInvite),
        InvitePubSubService.invitationReject({
          walletId: wallet.id,
          joiningUser,
        }),
        WalletPubSubService.publishWalletUpdates({ wallet }),
      ])
    }

    const [wa, deviceCount] = await Promise.all([
      WalletManager.addUser({
        ...decodedInvite,
        userId: joiningUser.id,
      }),
      InvitePubSubService.invitationAccept({
        joiningUser,
        walletId: wallet.id,
        encryptedSecretKey: encryptedSecretKey!,
        b64PublicECDHKey: b64PublicECDHKey!,
      }),
    ])

    /**
     * If joining user don't get this message, the whole process collapses.
     * So we need to keep an eye on it. We remove the WA if joining user disconnects
     * for some reason. He then can use the invite once again.
     */
    if (deviceCount === 0) {
      await WalletManager.removeUserByWaId(wa.id)
      throw new FormValidationError(InviteServiceFormErrors.joiningUserOffline)
    } else {
      await WalletPubSubService.publishWalletUpdates({ wallet })
    }
  }

  /**
   * Event sent by joining user if he something went wrong during the last stage of joining.
   * Wipes the WA and notifies the wallet owner about this.
   */
  static async joiningError({
    joiningUser,
    b64InviteString,
  }: {
    joiningUser: User
    b64InviteString: string
  }) {
    runSchemaWithFormError(requiredString, b64InviteString)

    // We don't do any checks, because one can only remove user using this method by
    // impersonating the user and if he has no chest attached to the WA.
    try {
      const { decodedInvite } = this.parseInviteString(b64InviteString)

      if (!('walletId' in decodedInvite))
        throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

      const [result, wallet] = await Promise.all([
          WalletManager.removeWithJoiningError({
            userId: joiningUser.id,
            ...decodedInvite,
          }),
          WalletManager.byId(decodedInvite.walletId),
        ]),
        owner =
          wallet &&
          wallet.users.find(
            (user) => user.WalletAccess.accessLevel === AccessLevels.owner,
          )

      if (!owner || typeof result !== 'number' || result === 0 || !wallet)
        throw new Error()

      if (result > 0)
        return Promise.all([
          InvitePubSubService.joiningError({
            ownerId: owner.id,
            walletId: wallet.id,
            username: joiningUser.username,
          }),
          WalletPubSubService.publishWalletUpdates({ wallet }),
        ])
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.unknownError)
    }
  }
}

export enum InviteServiceFormErrors {
  unknownError = 'unknownError',
  limitReached = 'limitReached',
  invalidInvite = 'invalidInvite',
  alreadyMember = 'alreadyMember',
  inviteAlreadyUsed = 'inviteAlreadyUsed',
  ownerOffline = 'ownerOffline',
  joiningUserOffline = 'joiningUserOffline',
}

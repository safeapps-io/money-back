import { decode } from 'base64-arraybuffer'
import * as yup from 'yup'

import { encryptAes, decryptAes } from '@/utils/crypto'

import User, { UserManager } from '@/models/user.model'
import { WalletManager } from '@/models/wallet.model'
import { AccessLevels } from '@/models/walletAccess.model'

import { FormValidationError } from '@/services/errors'
import { CryptoService } from '@/services/crypto'
import { InvitePubSubService } from './invitePubSubService'
import {
  runSchemaWithFormError,
  requiredString,
  optionalString,
} from '@/utils/yupHelpers'
import { WalletPubSubService } from '../wallet/walletPubSubService'

type GenericInviteObject = {
  id: string
}
type WalletInviteObject = {
  inviteId: string
  walletId: string
}

export class InviteService {
  static generateInviteString(userId: string): string {
    const invite: GenericInviteObject = { id: userId }
    return encryptAes(invite)
  }

  static async getUserIdFromInvite(invite?: string): Promise<string> {
    try {
      if (!invite) throw new Error()

      // TODO: remove it after we have interface that shows invite link
      if (process.env.NODE_ENV === 'development' && invite === 'qwerty') {
        return 'ok'
      }

      const id = decryptAes<GenericInviteObject>(invite).id
      const user = await UserManager.byId(id)

      if (!id || !user) throw new Error()

      return id
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }
  }

  private static inviteDelimiter = '___'
  private static parseInviteString(b64InviteString: string) {
    try {
      const [dataBuffer, signatureBuffer] = b64InviteString
          .split(this.inviteDelimiter)
          .map(decode),
        decodedInvite = JSON.parse(
          Buffer.from(dataBuffer).toString('utf-8'),
        ) as WalletInviteObject

      return {
        dataBuffer,
        signatureBuffer,
        decodedInvite: {
          walletId: decodedInvite.walletId,
          inviteId: decodedInvite.inviteId,
        },
      }
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }
  }

  private static validateInviteSchema = yup
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
  static async validateInvite({
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
    runSchemaWithFormError(this.validateInviteSchema, {
      b64InviteString,
      b64InviteSignatureByJoiningUser,
      b64PublicECDHKey,
    })

    const {
        dataBuffer,
        signatureBuffer,
        decodedInvite,
      } = this.parseInviteString(b64InviteString),
      wallet = await WalletManager.byId(decodedInvite.walletId)

    if (!wallet)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    let walletOwner = null
    for (const user of wallet.users) {
      if (user.id === joiningUser.id)
        throw new FormValidationError(InviteServiceFormErrors.alreadyMember)

      if (user.WalletAccess.inviteId === decodedInvite.inviteId)
        throw new FormValidationError(InviteServiceFormErrors.inviteAlreadyUsed)

      if (user.WalletAccess.accessLevel === AccessLevels.owner)
        walletOwner = user
    }

    if (!walletOwner || !walletOwner.b64InvitePublicKey)
      throw new FormValidationError(InviteServiceFormErrors.unknownError)

    const res = await CryptoService.verifyInvite({
      b64PublicKey: walletOwner.b64InvitePublicKey,
      dataBuffer,
      signatureBuffer,
    })
    if (!res)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    const devicesReached = await InvitePubSubService.requestToOwner({
      walletOwner,
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

    const { decodedInvite } = this.parseInviteString(b64InviteString),
      [wallet, joiningUser] = await Promise.all([
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

    const hasJoiningUserAskedToJoin = await CryptoService.verifyInvite({
      b64PublicKey: joiningUser.b64InvitePublicKey,
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
      await WalletManager.removeById(wa.id)
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
      const { decodedInvite } = this.parseInviteString(b64InviteString),
        [result, wallet] = await Promise.all([
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
  invalidInvite = 'invalidInvite',
  alreadyMember = 'alreadyMember',
  inviteAlreadyUsed = 'inviteAlreadyUsed',
  ownerOffline = 'ownerOffline',
  joiningUserOffline = 'joiningUserOffline',
}

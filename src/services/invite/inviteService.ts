import { decode } from 'base64-arraybuffer'
import { startOfMonth, endOfMonth } from 'date-fns'
import * as yup from 'yup'

import {
  runSchemaWithFormError,
  requiredString,
  optionalString,
} from '@/utils/yupHelpers'
import { encryptAes, decryptAes } from '@/utils/crypto'

import User, { UserManager } from '@/models/user.model'
import { WalletManager } from '@/models/wallet.model'
import { AccessLevels } from '@/models/walletAccess.model'

import { FormValidationError } from '@/services/errors'
import { CryptoService } from '@/services/crypto/cryptoService'
import { InvitePubSubService } from './invitePubSubService'
import { WalletPubSubService } from '@/services/wallet/walletPubSubService'
import { InviteServiceFormErrors, InviteStringTypes } from './inviteTypes'
import { InviteStringService } from './inviteStringService'

type EncryptedUserId = {
  userId: string
}
export enum Prizes {
  top10 = 'top10',
  top20 = 'top20',
  top50 = 'top50',
}

export class InviteService {
  public static getCurrentMonthlyInviteUsage(userId: string) {
    const now = new Date()

    return UserManager.countInvitedBetweenDates({
      userId,
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    })
  }

  public static getUserIdEnctypted(userId: string) {
    return encryptAes({ userId } as EncryptedUserId)
  }

  private static getDecryptedUserId(encryptedUserId: string) {
    return decryptAes<EncryptedUserId>(encryptedUserId).userId
  }

  public static async getCurrentWaitlistStats(
    encryptedUserId: string,
  ): Promise<{
    prize: null | Prizes
    currentInviteCount: number | null
    inviteLink: string
  }> {
    let userId: string
    try {
      userId = this.getDecryptedUserId(encryptedUserId)
    } catch (error) {
      throw new Error()
    }

    const { countMost, userCount } = await UserManager.countByMostInvites()
    let currentIndex: number | null = null,
      currentInviteCount: number | null = null
    for (let i = 0; i < countMost.length; i++) {
      const item = countMost[i]
      if (item.inviterId == userId) {
        currentIndex = i
        currentInviteCount = item.invitedCount
        break
      }
    }

    /**
     * It seems to be more transparent to compare the user to the whole
     * user base rather then those who invited at least someone
     */
    let prize: null | Prizes = null
    if (currentIndex != null)
      if (currentIndex < 0.1 * userCount) prize = Prizes.top10
      else if (currentIndex < 0.2 * userCount) prize = Prizes.top20
      else if (currentIndex < 0.5 * userCount) prize = Prizes.top50

    return {
      prize,
      currentInviteCount,
      inviteLink: InviteStringService.generatePrelaunchInvite(userId),
    }
  }

  private static baseInviteMonthlyLimit = 5
  static async parseAndValidateInvite(b64InviteString: string) {
    const res = await InviteStringService.parseAndVerifySignature(
      b64InviteString,
    )

    if (
      res.type == InviteStringTypes.prelaunch ||
      res.type == InviteStringTypes.launch
    )
      return res

    const user = res.userInviter,
      promises = [this.getCurrentMonthlyInviteUsage(user.id)]
    if (res.type == InviteStringTypes.service)
      promises.push(UserManager.isInviteDisposed(res.payload.inviteId))

    const [thisMonthInvitees, isInviteAlreadyUsed] = await Promise.all(promises)
    if (isInviteAlreadyUsed)
      throw new FormValidationError(InviteServiceFormErrors.inviteAlreadyUsed)

    if (
      thisMonthInvitees >=
      (user.inviteMonthlyLimit ?? this.baseInviteMonthlyLimit)
    )
      throw new FormValidationError(InviteServiceFormErrors.limitReached)

    return res
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

    const parsed = await this.parseAndValidateInvite(b64InviteString)
    if (parsed.type != InviteStringTypes.wallet)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    const { payload, userInviter } = parsed

    const wallet = await WalletManager.byId(payload.walletId)

    if (!wallet)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    for (const user of wallet.users) {
      if (user.id === joiningUser.id)
        throw new FormValidationError(InviteServiceFormErrors.alreadyMember)

      if (user.WalletAccess.inviteId === payload.inviteId)
        throw new FormValidationError(InviteServiceFormErrors.inviteAlreadyUsed)

      if (
        user.WalletAccess.accessLevel === AccessLevels.owner &&
        user.id != userInviter.id
      )
        throw new FormValidationError(InviteServiceFormErrors.unknownError)
    }

    const devicesReached = await InvitePubSubService.requestToOwner({
      walletOwner: userInviter,
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
    const parsed = await InviteStringService.parseAndVerifySignature(
      b64InviteString,
    )
    if (parsed.type != InviteStringTypes.wallet)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    const { payload } = parsed,
      [wallet, joiningUser] = await Promise.all([
        WalletManager.byId(payload.walletId),
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

    return { payload, wallet, joiningUser }
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
      payload,
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
        WalletManager.addRejectedInvite(payload),
        InvitePubSubService.invitationReject({
          walletId: wallet.id,
          joiningUser,
        }),
        WalletPubSubService.publishWalletUpdates({ wallet }),
      ])
    }

    const [wa, deviceCount] = await Promise.all([
      WalletManager.addUser({
        ...payload,
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
      const parsed = await InviteStringService.parseAndVerifySignature(
        b64InviteString,
      )
      if (parsed.type != InviteStringTypes.wallet)
        throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

      const { payload } = parsed,
        [result, wallet] = await Promise.all([
          WalletManager.removeWithJoiningError({
            userId: joiningUser.id,
            ...payload,
          }),
          WalletManager.byId(payload.walletId),
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

import * as yup from 'yup'

import {
  runSchemaWithFormError,
  requiredString,
  optionalString,
} from '@/utils/yupHelpers'
import { encryptAes } from '@/utils/crypto'

import User, { UserManager } from '@/models/user.model'
import { WalletManager } from '@/models/wallet.model'
import { AccessLevels } from '@/models/walletAccess.model'

import { FormValidationError } from '@/services/errors'
import { InviteServiceFormErrors, InviteStringTypes } from './inviteTypes'
import { InviteStringService } from './inviteStringService'
import { publishWalletUpdate } from '@/services/wallet/walletEvents'
import {
  invitationError,
  inviteAccept,
  requestToOwner,
  inviteReject,
  joiningError,
} from './inviteEvents'

type EncryptedUserId = {
  userId: string
}

export class InviteService {
  public static getUserIdEnctypted(userId: string) {
    return encryptAes({ userId } as EncryptedUserId)
  }

  static async parseAndValidateInvite(b64InviteString: string) {
    const res = await InviteStringService.parseAndVerifySignature(
      b64InviteString,
    )

    if (res.type == InviteStringTypes.wallet) {
      const wasDisposed = await WalletManager.isWalletInviteDisposed({
        inviteId: res.payload.inviteId,
        walletId: res.payload.walletId,
      })
      if (wasDisposed)
        throw new FormValidationError(InviteServiceFormErrors.inviteAlreadyUsed)
    }

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
    clientId,
    joiningUser,
    b64InviteString,
    b64InviteSignatureByJoiningUser,
    b64PublicECDHKey,
  }: {
    clientId: string
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

      if (
        user.WalletAccess.accessLevel === AccessLevels.owner &&
        user.id != userInviter.id
      )
        throw new FormValidationError(InviteServiceFormErrors.unknownError)
    }

    const devicesReached = await requestToOwner({
      clientId,
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
    walletOwnerId,
    joiningUserId,
    b64InviteSignatureByJoiningUser,
    b64InviteString,
  }: {
    walletOwnerId: string
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
    if (!dbWalletOwner || dbWalletOwner.id !== walletOwnerId)
      throw new FormValidationError(InviteServiceFormErrors.unknownError)

    const hasJoiningUserAskedToJoin = InviteStringService.verifyJoiningUserInviteSignature(
      {
        inviteString: b64InviteString,
        joiningUserInvitePublicKey: joiningUser.b64InvitePublicKey as string,
        joiningUserSignature: b64InviteSignatureByJoiningUser,
      },
    )
    if (!hasJoiningUserAskedToJoin)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    return { payload, wallet, joiningUser }
  }

  /**
   * Event sent by wallet owner if some of the operations failed for some reason.
   * It will inform joining user that something went wrong.
   */
  static async invitationError({
    clientId,
    walletOwnerId,
    joiningUserId,
    b64InviteSignatureByJoiningUser,
    b64InviteString,
  }: {
    clientId: string
    walletOwnerId: string
    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
  }) {
    const { joiningUser, wallet } = await this.checkOwnerInvitationMessage({
      walletOwnerId,
      joiningUserId,
      b64InviteString,
      b64InviteSignatureByJoiningUser,
    })
    return invitationError({
      clientId,
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
    clientId,
    walletOwnerId,
    allowJoin,
    joiningUserId,
    b64InviteSignatureByJoiningUser,
    b64InviteString,

    b64PublicECDHKey,
    encryptedSecretKey,
  }: {
    clientId: string
    walletOwnerId: string

    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
  } & (
    | {
        allowJoin: true
        b64PublicECDHKey: string
        encryptedSecretKey: string
      }
    | {
        allowJoin: false
        b64PublicECDHKey: undefined
        encryptedSecretKey: undefined
      }
  )) {
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
      walletOwnerId,
      joiningUserId,
      b64InviteString,
      b64InviteSignatureByJoiningUser,
    })

    if (!allowJoin) {
      /**
       * 1. save rejected invite
       * 2. tell joining user about the reject
       * 3. push updated wallet to all the wallet users
       */
      return Promise.all([
        WalletManager.addRejectedInvite(payload),
        inviteReject({
          clientId,
          walletId: wallet.id,
          joiningUser,
        }),
        publishWalletUpdate({
          clientId,
          wallet: (await WalletManager.byId(wallet.id))!,
        }),
      ])
    }

    const [wa, deviceCount] = await Promise.all([
      WalletManager.addUser({
        ...payload,
        userId: joiningUser.id,
      }),
      inviteAccept({
        clientId,
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
    }
  }

  /**
   * Event sent by joining user if he something went wrong during the last stage of joining.
   * Wipes the WA and notifies the wallet owner about this.
   */
  static async joiningError({
    clientId,
    joiningUser,
    b64InviteString,
  }: {
    clientId: string
    joiningUser: User
    b64InviteString: string
  }) {
    runSchemaWithFormError(requiredString, b64InviteString)

    // We don't do any checks, because one can only remove user using this method by
    // impersonating the user and if he has no chest attached to the WA.
    const parsed = await InviteStringService.parseAndVerifySignature(
      b64InviteString,
    )
    if (parsed.type != InviteStringTypes.wallet)
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)

    const { payload } = parsed,
      result = await WalletManager.removeWithJoiningError({
        userId: joiningUser.id,
        inviteId: payload.inviteId,
        walletId: payload.walletId,
      }),
      wallet = await WalletManager.byId(payload.walletId),
      owner =
        wallet &&
        wallet.users.find(
          (user) => user.WalletAccess.accessLevel === AccessLevels.owner,
        )

    if (!owner || typeof result !== 'number' || result === 0 || !wallet)
      throw new Error()

    if (result > 0)
      return Promise.all([
        joiningError({
          clientId,
          ownerId: owner.id,
          walletId: wallet.id,
          username: joiningUser.username,
        }),
        publishWalletUpdate({ clientId, wallet }),
      ])
  }
}

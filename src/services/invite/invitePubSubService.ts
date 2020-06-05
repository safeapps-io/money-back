import User from '@/models/user.model'
import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '@/services/user/userPubSubService'

/**
 * Handles async invite flow
 */
export class InvitePubSubService {
  static async requestToOwner({
    walletOwner,
    joiningUser,
    b64InviteString,
    b64InviteSignatureByJoiningUser,
    b64PublicECDHKey,
  }: {
    walletOwner: User
    joiningUser: User
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
    b64PublicECDHKey: string
  }) {
    return UserPubSubService.publishForUser({
      userId: walletOwner.id,
      type: UserPubSubMessageTypes.initialRequestToOwner,
      data: {
        b64InviteString,
        b64InviteSignatureByJoiningUser,
        joiningUser: {
          id: joiningUser.id,
          username: joiningUser.username,
          b64PublicECDHKey,
        },
      },
    })
  }

  static async invitationError({
    joiningUser,
    walletId,
  }: {
    joiningUser: User
    walletId: string
  }) {
    return UserPubSubService.publishForUser({
      userId: joiningUser.id,
      type: UserPubSubMessageTypes.invitationError,
      data: {
        walletId,
      },
    })
  }

  static async invitationAccept({
    joiningUser,
    encryptedSecretKey,
    walletId,
    b64PublicECDHKey,
  }: {
    joiningUser: User
    encryptedSecretKey: string
    walletId: string
    b64PublicECDHKey: string
  }) {
    return UserPubSubService.publishForUser({
      userId: joiningUser.id,
      type: UserPubSubMessageTypes.invitationAccept,
      data: {
        walletId,
        encryptedSecretKey,
        b64PublicECDHKey,
      },
    })
  }

  static async invitationReject({
    joiningUser,
    walletId,
  }: {
    joiningUser: User
    walletId: string
  }) {
    return UserPubSubService.publishForUser({
      userId: joiningUser.id,
      type: UserPubSubMessageTypes.invitationReject,
      data: {
        walletId,
      },
    })
  }

  static async joiningError({
    ownerId,
    walletId,
    username,
  }: {
    ownerId: string
    walletId: string
    username: string
  }) {
    return UserPubSubService.publishForUser({
      userId: ownerId,
      type: UserPubSubMessageTypes.invitationError,
      data: {
        walletId,
        username,
      },
    })
  }
}

import { WSMiddleware, WSWrapper } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import {
  UserPubSubMessageTypes,
  UserPubSubService,
} from '@/services/user/userPubSubService'
import { InviteService } from './inviteService'

enum ClientTypes {
  // Messages from joining user
  validateInvite = 'validateInvite',
  joiningError = 'joiningError',

  // Messages from wallet owner
  invitationError = 'invitationError',
  invitationResolution = 'invitationResolution',
}

export type InviteIncomingMessages = {
  [ClientTypes.validateInvite]: {
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
    b64PublicECDHKey: string
  }
  [ClientTypes.invitationError]: {
    joiningUserId: string
    b64InviteSignatureByJoiningUser: string
    b64InviteString: string
  }
  [ClientTypes.invitationResolution]: {
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
  )
  [ClientTypes.joiningError]: {
    b64InviteString: string
  }
}

/**
 * Some of these repeat `UserPubSubMessageTypes`
 */
enum BackTypes {
  // Messages to wallet owner
  validateInvite = 'invite/validate',

  // Messages to joining user
  validateTriggerSuccess = 'invite/validateTriggerSuccess',
  validateTriggerError = 'invite/validateTriggerError',

  invitationError = 'invite/invititationError',
  invitationAccept = 'invite/accept',
  invitationReject = 'invite/reject',
  unknownError = 'invite/unknownError',
}

const pubSubPurpose = 'invite'

type M = WSMiddleware<InviteIncomingMessages, DefaultWsState>
export class InviteWsMiddleware implements M {
  static [ClientTypes.validateInvite]: M[ClientTypes.validateInvite] = async ({
    wsWrapped,
    message,
  }) => {
    // Subscribe joining user to the joining user resolution messages
    await UserPubSubService.subscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.user.id,
      purpose: pubSubPurpose,
      callback: ({ type, data }) => {
        switch (type) {
          case UserPubSubMessageTypes.inviteError:
            wsWrapped.send({ type: BackTypes.invitationError, data })
            break

          case UserPubSubMessageTypes.inviteReject:
            wsWrapped.send({ type: BackTypes.invitationReject, data })
            break

          case UserPubSubMessageTypes.inviteAccept:
            wsWrapped.send({ type: BackTypes.invitationAccept, data })
            break
        }
      },
    })

    try {
      await InviteService.launchWalletJoin({
        joiningUser: wsWrapped.user,
        ...message,
      })
      wsWrapped.send({ type: BackTypes.validateTriggerSuccess })
    } catch (error) {
      wsWrapped.send({
        type: BackTypes.validateTriggerError,
        data: { error: error.message },
      })
    }
  }

  static [ClientTypes.invitationError]: M[ClientTypes.invitationError] = async ({
    wsWrapped,
    message,
  }) => {
    try {
      await InviteService.invitationError({
        walletOwner: wsWrapped.user,
        ...message,
      })
    } catch (error) {
      // Seems to be a malware alike case
      wsWrapped.send({ type: BackTypes.unknownError })
    }
  }

  static [ClientTypes.invitationResolution]: M[ClientTypes.invitationResolution] = async ({
    wsWrapped,
    message,
  }) => {
    try {
      await InviteService.invitationResolution({
        walletOwner: wsWrapped.user,
        ...message,
      })
    } catch (error) {
      wsWrapped.send({
        type: BackTypes.unknownError,
        data: { error: error.message },
      })
    }
  }

  static [ClientTypes.joiningError]: M[ClientTypes.joiningError] = async ({
    wsWrapped,
    message,
  }) => {
    try {
      await InviteService.joiningError({
        joiningUser: wsWrapped.user,
        ...message,
      })
    } catch (error) {
      wsWrapped.send({
        type: BackTypes.unknownError,
        data: { error: error.message },
      })
    }
  }

  static close: M['close'] = async (wsWrapped) => {
    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.user.id,
    })
  }
}

const ownerPubSubPurpose = pubSubPurpose + 'Owner'
export const subscribeOwnerForInviteValidation = (
  wsWrapped: WSWrapper<DefaultWsState>,
) =>
  UserPubSubService.subscribeSocketForUser({
    socketId: wsWrapped.id,
    userId: wsWrapped.user.id,
    purpose: ownerPubSubPurpose,
    callback: ({ type, data }) => {
      switch (type) {
        case UserPubSubMessageTypes.inviteValidate:
          wsWrapped.send({ type: BackTypes.validateInvite, data })
          break
      }
    },
  })

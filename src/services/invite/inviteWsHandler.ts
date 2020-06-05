import { WSMiddleware } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import { InviteService } from './inviteService'

enum ITypes {
  validateInvite = 'validateInvite',

  invitationError = 'invitationError',
  invitationResolution = 'invitationResolution',

  joiningError = 'joiningError',
}

export type InviteIncomingMessages = {
  [ITypes.validateInvite]: {
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
    b64PublicECDHKey: string
  }
  [ITypes.invitationError]: {
    joiningUserId: string
    b64InviteSignatureByJoiningUser: string
    b64InviteString: string
  }
  [ITypes.invitationResolution]: {
    allowJoin: boolean
    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string

    b64PublicECDHKey?: string
    encryptedSecretKey?: string
  }
  [ITypes.joiningError]: {
    b64InviteString: string
  }
}

enum OTypes {
  validateTriggerSuccess = 'validateTriggerSuccess',
  validateTriggerError = 'validateTriggerError',

  error = 'error',
}

type M = WSMiddleware<InviteIncomingMessages, DefaultWsState>
export class InviteWsMiddleware implements M {
  static [ITypes.validateInvite]: M[ITypes.validateInvite] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    try {
      await InviteService.validateInvite({
        joiningUser: wsWrapped.state.user,
        ...message,
      })
      wsWrapped.send({ type: OTypes.validateTriggerSuccess })
    } catch (error) {
      wsWrapped.send({
        type: OTypes.validateTriggerError,
        data: { error: error.message },
      })
    }
  }

  static [ITypes.invitationError]: M[ITypes.invitationError] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    try {
      await InviteService.invitationError({
        walletOwner: wsWrapped.state.user,
        ...message,
      })
    } catch (error) {
      // Seems to be a malware alike case
      wsWrapped.send({ type: OTypes.error })
    }
  }

  static [ITypes.invitationResolution]: M[ITypes.invitationResolution] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    try {
      await InviteService.invitationResolution({
        walletOwner: wsWrapped.state.user,
        ...message,
      })
    } catch (error) {
      wsWrapped.send({ type: OTypes.error, data: { error: error.message } })
    }
  }

  static [ITypes.joiningError]: M[ITypes.joiningError] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    try {
      await InviteService.joiningError({
        joiningUser: wsWrapped.state.user,
        ...message,
      })
    } catch (error) {
      wsWrapped.send({ type: OTypes.error, data: { error: error.message } })
    }
  }
}

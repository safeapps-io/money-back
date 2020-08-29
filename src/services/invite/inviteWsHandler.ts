import { WSMiddleware } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import { InviteService } from './inviteService'

enum ClientTypes {
  validateInvite = 'validateInvite',

  invitationError = 'invitationError',
  invitationResolution = 'invitationResolution',

  joiningError = 'joiningError',
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
    allowJoin: boolean
    joiningUserId: string
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string

    b64PublicECDHKey?: string
    encryptedSecretKey?: string
  }
  [ClientTypes.joiningError]: {
    b64InviteString: string
  }
}

enum BackTypes {
  validateTriggerSuccess = 'validateTriggerSuccess',
  validateTriggerError = 'validateTriggerError',

  error = 'error',
}

type M = WSMiddleware<InviteIncomingMessages, DefaultWsState>
export class InviteWsMiddleware implements M {
  static [ClientTypes.validateInvite]: M[ClientTypes.validateInvite] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    try {
      await InviteService.launchWalletJoin({
        joiningUser: wsWrapped.state.user,
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
    if (!wsWrapped.state.user) return

    try {
      await InviteService.invitationError({
        walletOwner: wsWrapped.state.user,
        ...message,
      })
    } catch (error) {
      // Seems to be a malware alike case
      wsWrapped.send({ type: BackTypes.error })
    }
  }

  static [ClientTypes.invitationResolution]: M[ClientTypes.invitationResolution] = async ({
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
      wsWrapped.send({ type: BackTypes.error, data: { error: error.message } })
    }
  }

  static [ClientTypes.joiningError]: M[ClientTypes.joiningError] = async ({
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
      wsWrapped.send({ type: BackTypes.error, data: { error: error.message } })
    }
  }
}

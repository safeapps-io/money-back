import User from '@/models/user.model'
import { redisPubSub } from '../redis/pubSub'

const enum MessageTypes {
  validate = 'validate',
  error = 'error',
  reject = 'reject',
  accept = 'accept',
}

const callbackKey = 'invite'

export const inviteEventSender = async (
  userId: string,
  clientId: string,
  send: SSESender,
) => {
  const props = {
    channels: [redisPubSub.getUserChannel(userId)],
    clientId,
  }

  await redisPubSub.subscribe<
    | InviteValidateEvent
    | InviteErrorEvent
    | InviteAcceptEvent
    | InviteRejectEvent
    | InviteJoiningError
  >({
    ...props,
    callbackKey,
    callback: send,
  })

  return () => redisPubSub.unsubscribe(props)
}

export const requestToOwner = ({
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
  }) => {
    const data: InviteValidateEvent = {
      type: MessageTypes.validate,
      data: {
        b64InviteString,
        b64InviteSignatureByJoiningUser,
        joiningUser: {
          id: joiningUser.id,
          username: joiningUser.username,
          b64PublicECDHKey,
        },
      },
    }

    return redisPubSub.publish({
      channel: redisPubSub.getUserChannel(walletOwner.id),
      data,
      callbackKey,
    })
  },
  invitationError = ({
    joiningUser,
    walletId,
  }: {
    joiningUser: User
    walletId: string
  }) => {
    const data: InviteErrorEvent = {
      type: MessageTypes.error,
      data: {
        walletId,
      },
    }

    return redisPubSub.publish({
      channel: redisPubSub.getUserChannel(joiningUser.id),
      data,
      callbackKey,
    })
  },
  inviteAccept = ({
    joiningUser,
    encryptedSecretKey,
    walletId,
    b64PublicECDHKey,
  }: {
    joiningUser: User
    encryptedSecretKey: string
    walletId: string
    b64PublicECDHKey: string
  }) => {
    const data: InviteAcceptEvent = {
      type: MessageTypes.accept,
      data: {
        walletId,
        encryptedSecretKey,
        b64PublicECDHKey,
      },
    }

    return redisPubSub.publish({
      channel: redisPubSub.getUserChannel(joiningUser.id),
      data,
      callbackKey,
    })
  },
  inviteReject = ({
    joiningUser,
    walletId,
  }: {
    joiningUser: User
    walletId: string
  }) => {
    const data: InviteRejectEvent = {
      type: MessageTypes.reject,
      data: {
        walletId,
      },
    }
    return redisPubSub.publish({
      channel: redisPubSub.getUserChannel(joiningUser.id),
      data,
      callbackKey,
    })
  },
  joiningError = ({
    ownerId,
    walletId,
    username,
  }: {
    ownerId: string
    walletId: string
    username: string
  }) => {
    const data: InviteJoiningError = {
      type: MessageTypes.error,
      data: {
        walletId,
        username,
      },
    }
    return redisPubSub.publish({
      channel: redisPubSub.getUserChannel(ownerId),
      data,
      callbackKey,
    })
  }

type InviteValidateEvent = {
  type: MessageTypes.validate
  data: {
    b64InviteString: string
    b64InviteSignatureByJoiningUser: string
    joiningUser: {
      id: string
      username: string
      b64PublicECDHKey: string
    }
  }
}
type InviteErrorEvent = {
  type: MessageTypes.error
  data: {
    walletId: string
  }
}
type InviteAcceptEvent = {
  type: MessageTypes.accept
  data: {
    walletId: string
    encryptedSecretKey: string
    b64PublicECDHKey: string
  }
}
type InviteRejectEvent = {
  type: MessageTypes.reject
  data: {
    walletId: string
  }
}
type InviteJoiningError = {
  type: MessageTypes.error
  data: {
    walletId: string
    username: string
  }
}

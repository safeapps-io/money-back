import { serializeModel, Serializers } from '@/models/serializers'
import User from '@/models/user.model'
import { redisPubSub } from '../redis/pubSub'

const enum MessageTypes {
  data = 'user/data',
}

type UserDataEvent = { type: MessageTypes.data; data: User }

const callbackKey = 'user'

export const userEventSender = async (
  userId: string,
  clientId: string,
  send: SSESender,
) => {
  const props = {
    channels: [redisPubSub.getUserChannel(userId)],
    clientId,
  }

  await redisPubSub.subscribe<UserDataEvent>({
    ...props,
    callbackKey,
    callback: send,
  })

  return () => redisPubSub.unsubscribe(props)
}

export const publishUserUpdate = ({
  clientId,
  user,
}: {
  clientId: string
  user: User
}) => {
  const data: UserDataEvent = {
    data: serializeModel(user, Serializers.userFullNoAssociations),
    type: MessageTypes.data,
  }
  return redisPubSub.publish({
    channel: redisPubSub.getUserChannel(user.id),
    clientId,
    data,
    callbackKey,
  })
}

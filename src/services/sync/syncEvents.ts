import Entity from '@/models/entity.model'
import { serializeModel, Serializers } from '@/models/serializers'
import Wallet from '@/models/wallet.model'
import { redisPubSub } from '../redis/pubSub'

const enum MessageTypes {
  data = 'entity/data',
}

type SyncDataEvent = { type: MessageTypes.data; data: Entity[] }

const callbackKey = 'sync'

export const syncEventSender = async (userId: string, clientId: string, send: SSESender) => {
  const props = {
    channels: [redisPubSub.getUserChannel(userId)],
    clientId,
  }

  await redisPubSub.subscribe<SyncDataEvent>({
    ...props,
    callbackKey,
    callback: send,
  })

  return () => redisPubSub.unsubscribe(props)
}

export const publishEntityUpdate = ({
  clientId,
  wallet,
  entities,
}: {
  clientId: string
  wallet: Wallet
  entities: Entity[]
}) => {
  if (!wallet.users) throw new Error('Prefetch users!')

  const data: SyncDataEvent = {
    type: MessageTypes.data,
    data: serializeModel(entities, Serializers.entity),
  }

  return Promise.all(
    wallet.users.map((user) =>
      redisPubSub.publish({
        channel: redisPubSub.getUserChannel(user.id),
        clientId,
        data,
        callbackKey,
      }),
    ),
  )
}

import ChargeEvent from '@/models/billing/chargeEvent.model'
import { serializeModel, Serializers } from '@/models/serializers'
import { redisPubSub } from '@/services/redis/pubSub'

const enum MessageTypes {
  charge = 'charge',
}

type BillingChargeEvent = { type: MessageTypes.charge; data: ChargeEvent }

const callbackKey = 'billing'

export const chargeEventSender = async (
  userId: string,
  clientId: string,
  send: SSESender,
) => {
  const props = {
    channels: [redisPubSub.getUserChannel(userId)],
    clientId,
  }

  await redisPubSub.subscribe<BillingChargeEvent>({
    ...props,
    callbackKey,
    callback: send,
  })

  return () => redisPubSub.unsubscribe(props)
}

export const publishChargeUpdate = ({
  chargeEvent,
  relatedUserIds,
}: {
  chargeEvent: ChargeEvent
  relatedUserIds: string[]
}) => {
  return Promise.all(
    relatedUserIds.map((id) =>
      redisPubSub.publish({
        channel: redisPubSub.getUserChannel(id),
        callbackKey,
        data: serializeModel(chargeEvent, Serializers.chargeEvent),
      }),
    ),
  )
}

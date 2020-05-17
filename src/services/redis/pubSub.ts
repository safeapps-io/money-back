import { subscriptionConnection, connection } from './connection'

type BaseMessage = {
  data: any
  // publisherId
  id: string
}

class RedisPubSubService {
  constructor(
    public log = {} as {
      [channelName: string]: { [subscriberId: string]: (data: any) => void }
    },
  ) {}

  async init() {
    subscriptionConnection.on('message', this.handleMessage)
  }

  handleMessage(channel: string, message: string) {
    if (!this.log[channel]) return

    const { id: publisherId, data } = JSON.parse(message) as BaseMessage
    Object.entries(this.log[channel]).forEach(
      // Preventing users from getting their own updates
      ([subscriberId, fn]) => publisherId !== subscriberId && fn(data),
    )
  }

  publish({
    channel,
    publisherId,
    data,
  }: {
    channel: string
    publisherId: string
    data: any
  }) {
    const message: BaseMessage = { id: publisherId, data }
    return connection.publish(channel, JSON.stringify(message))
  }

  async subscribe({
    channels,
    subscriberId,
    callback,
  }: {
    channels: string[]
    subscriberId: string
    callback: (data: any) => void
  }) {
    await subscriptionConnection.subscribe(...channels)
    for (const channel of channels) {
      if (!this.log[channel]) this.log[channel] = {}
      this.log[channel][subscriberId] = callback
    }
  }

  async unsubscribe({
    channels,
    subscriberId,
  }: {
    channels: string[]
    subscriberId: string
  }) {
    for (const channel of channels) {
      delete this.log[channel][subscriberId]
      if (!Object.keys(this.log[channel]).length) {
        delete this.log[channel]
        await subscriptionConnection.unsubscribe(channel)
      }
    }
  }
}

export const redisPubSub = new RedisPubSubService()

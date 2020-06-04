import { subscriptionConnection, connection } from './connection'

type BaseMessage = {
  data: any
  // publisherId
  id: string
}

/**
 * Generic class that helps you work with redis pubsub channels.
 *
 * Very unopinionated, can work with any kind of user (registered, anonymous or even with machine)
 * or JSON-data (wallet data, emails, pushes, etc.).
 *
 * All it does is essentially holding subscriber function in local scope and wrapping redis'
 * pubsub mechanizm. Allows any number of subscriber handlers for a given subscriber id and channel.
 */
class RedisPubSubService {
  constructor(
    public log = {} as {
      [channelName: string]: {
        [subscriberId: string]: Array<(data: any) => void>
      }
    },
  ) {}

  init() {
    subscriptionConnection.on('message', this.handleMessage)
  }

  handleMessage(channel: string, message: string) {
    if (!this.log[channel]) return

    try {
      const { id: publisherId, data } = JSON.parse(message) as BaseMessage
      Object.entries(this.log[channel]).forEach(
        // Preventing users from getting their own updates
        ([subscriberId, fns]) =>
          publisherId !== subscriberId && fns.forEach(fn => fn(data)),
      )
    } catch (error) {
      // Maybe logging? Something went wrong with either parsing or function handler
    }
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
    const alreadySubscribed = Object.keys(this.log),
      subscribeToChannels = channels.filter(
        channel => !alreadySubscribed.includes(channel),
      )
    // Only subscribe to those which we haven't subscribed to yet
    await subscriptionConnection.subscribe(...subscribeToChannels)

    for (const channel of channels) {
      if (!this.log[channel]) this.log[channel] = {}
      if (!this.log[channel][subscriberId]) this.log[channel][subscriberId] = []
      this.log[channel][subscriberId].push(callback)
    }
  }

  private async handleChannelWithoutSubscribers(channel: string) {
    if (!Object.keys(this.log[channel]).length) {
      delete this.log[channel]
      await subscriptionConnection.unsubscribe(channel)
    }
  }

  async removeHandler({
    channels,
    subscriberId,
    callback,
  }: {
    channels: string[]
    subscriberId: string
    callback: (data: any) => void
  }) {
    for (const channel of channels) {
      // Filtering out the callback
      this.log[channel][subscriberId] = this.log[channel][subscriberId].filter(
        handler => handler !== callback,
      )
      // If this was the last callback we remove the subscriber
      if (!this.log[channel][subscriberId].length)
        delete this.log[channel][subscriberId]

      await this.handleChannelWithoutSubscribers(channel)
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
      await this.handleChannelWithoutSubscribers(channel)
    }
  }
}

export const redisPubSub = new RedisPubSubService()

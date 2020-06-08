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
  public log: Map<
    string,
    {
      [subscriberId: string]: { [handlerKey: string]: (data: any) => void }
    }
  >
  constructor() {
    this.log = new Map()
  }

  init() {
    subscriptionConnection.on('message', this.handleMessage)
  }

  handleMessage(channel: string, message: string) {
    if (!this.log.has(channel)) return

    try {
      const { id: publisherId, data } = JSON.parse(message) as BaseMessage,
        channelSubs = this.log.get(channel)
      if (!channelSubs) return

      Object.entries(channelSubs).forEach(
        // Preventing users from getting their own updates
        ([subscriberId, fns]) =>
          publisherId !== subscriberId &&
          Object.values(fns).forEach(fn => fn(data)),
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

  /**
   * Everything seems quite obvious except callbackKey.
   * So the idea is that we decouple redis work with subscription callbacks. Because of that we
   * can have many subscriber handlers for one subscription. This method can be called multiple
   * times passing a different (not strict equal) handler but serving the same purpose.
   *
   * That is why we made an array of handlers into a map of handlers.
   * Now you can invoke this method as many times as you wish and functions won't pile up in stack.
   */
  async subscribe({
    channels,
    subscriberId,
    callback,
    callbackKey = '',
  }: {
    channels: string[]
    subscriberId: string
    callback: (data: any) => void
    callbackKey?: string
  }) {
    const subscribeToChannels = channels.filter(
      channel => !this.log.has(channel),
    )

    if (subscribeToChannels.length)
      // Only subscribe to those which we haven't subscribed to yet
      await subscriptionConnection.subscribe(...subscribeToChannels)

    for (const channel of channels) {
      if (!this.log.has(channel)) this.log.set(channel, {})
      const channelSubs = this.log.get(channel)!

      if (!channelSubs[subscriberId]) channelSubs[subscriberId] = {}
      channelSubs[subscriberId][callbackKey] = callback
    }
  }

  private async handleChannelWithoutSubscribers(channel: string) {
    const channelSubs = this.log.get(channel)
    if (channelSubs && !Object.keys(channelSubs).length) {
      this.log.delete(channel)
      await subscriptionConnection.unsubscribe(channel)
    }
  }

  async removeHandler({
    channels,
    subscriberId,
    callbackKey = '',
  }: {
    channels: string[]
    subscriberId: string
    callbackKey?: string
  }) {
    for (const channel of channels) {
      const channelSubs = this.log.get(channel)
      if (!channelSubs) continue

      // Filtering out the callback

      delete channelSubs[subscriberId][callbackKey]
      // If this was the last callback we remove the subscriber
      if (!Object.keys(channelSubs[subscriberId]).length)
        delete channelSubs[subscriberId]

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
      const channelSubs = this.log.get(channel)
      if (channelSubs) delete channelSubs[subscriberId]

      await this.handleChannelWithoutSubscribers(channel)
    }
  }
}

export const redisPubSub = new RedisPubSubService()

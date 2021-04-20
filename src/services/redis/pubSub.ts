import { subscriptionConnection, redisConnection } from './connection'

type BaseMessage = {
  data: any
  clientId: string
  callbackKey: string
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
  private log: Map<
    string,
    {
      [clientId: string]: {
        [callbackKey: string]: (data: any) => void
      }
    }
  >
  constructor() {
    this.log = new Map()
  }

  init() {
    subscriptionConnection.on('message', (channel: string, message: string) =>
      this.handleMessage(channel, message),
    )
  }

  getUserChannel(userId: string) {
    return `user--${userId}`
  }

  private handleMessage(channel: string, message: string) {
    const channelSubs = this.log.get(channel)
    if (!channelSubs) return

    const { clientId: messageClientId, callbackKey, data } = JSON.parse(
      message,
    ) as BaseMessage

    for (const [clientId, fns] of Object.entries(channelSubs)) {
      // Preventing users from getting their own updates
      if (clientId === messageClientId) continue

      try {
        fns[callbackKey]?.(data)
      } catch (error) {
        console.error('Redis Pubsub message handler fail', error)
      }
    }
  }

  publish({
    channel,
    data,
    callbackKey,
    clientId = '',
  }: {
    channel: string
    callbackKey: string
    data: Object | number | string
    clientId?: string
  }) {
    const message: BaseMessage = { clientId, callbackKey, data }
    return redisConnection.publish(channel, JSON.stringify(message))
  }

  /**
   * Нам надо также передавать его в publish-метод, чтобы он пихался в редис, чтобы тот в
   * `handleMessage` вызывал только те коллбэки, которые к этому `callbackKey` относятся.
   *
   * Everything seems quite obvious except callbackKey.
   * So the idea is that we decouple redis work with subscription callbacks. Because of that we
   * can have many subscriber handlers for one subscription. This method can be called multiple
   * times passing a different (not strict equal) handler but serving the same purpose.
   *
   * That is why we made an array of handlers into a map of handlers.
   * Now you can invoke this method as many times as you wish and functions won't pile up in stack.
   */
  async subscribe<T>({
    channels,
    clientId,
    callback,
    callbackKey,
  }: {
    channels: string[]
    clientId: string
    callback: (data: T) => void
    callbackKey: string
  }) {
    const subscribeToChannels = channels.filter(
      (channel) => !this.log.has(channel),
    )

    if (subscribeToChannels.length)
      // Only subscribe to those which we haven't subscribed to yet
      await subscriptionConnection.subscribe(...subscribeToChannels)

    for (const channel of channels) {
      if (!this.log.has(channel)) this.log.set(channel, {})
      const channelSubs = this.log.get(channel)!

      if (!channelSubs[clientId]) channelSubs[clientId] = {}
      channelSubs[clientId][callbackKey] = callback
    }
  }

  private async handleChannelWithoutSubscribers(channel: string) {
    const channelSubs = this.log.get(channel)
    if (channelSubs && !Object.keys(channelSubs).length) {
      this.log.delete(channel)
      await subscriptionConnection.unsubscribe(channel)
    }
  }

  async unsubscribe({
    channels,
    clientId,
  }: {
    channels: string[]
    clientId: string
  }) {
    for (const channel of channels) {
      const channelSubs = this.log.get(channel)
      if (channelSubs) delete channelSubs[clientId]

      await this.handleChannelWithoutSubscribers(channel)
    }
  }
}

export const redisPubSub = new RedisPubSubService()

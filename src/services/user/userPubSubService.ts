import { redisPubSub } from '@/services/redis/pubSub'
import User from '@/models/user.model'

export class UserPubSubService {
  private static channelUserUpdates(userId: string) {
    return `user-u--${userId}`
  }

  static async publishUserUpdates({
    socketId,
    user,
  }: {
    socketId: string
    user: User
  }) {
    return redisPubSub.publish({
      channel: this.channelUserUpdates(user.id),
      publisherId: socketId,
      data: user,
    })
  }

  static subscribeUserUpdates({
    socketId,
    userId,
    callback,
  }: {
    socketId: string
    userId: string
    callback: (data: User) => void
  }) {
    return redisPubSub.subscribe({
      channels: [this.channelUserUpdates(userId)],
      subscriberId: socketId,
      callback,
    })
  }

  static unsubscribeUserUpdates({
    socketId,
    userId,
  }: {
    socketId: string
    userId: string
  }) {
    return redisPubSub.unsubscribe({
      channels: [this.channelUserUpdates(userId)],
      subscriberId: socketId,
    })
  }
}

import { redisPubSub } from '@/services/redis/pubSub'

export enum UserPubSubMessageTypes {
  // UserUpdatesPubSubService
  userUpdates = 'userUpdates',

  // WalletPubSubService
  walletUpdate = 'walletUpdate',
  walletDestroy = 'walletDestroy',

  // InvitePubSubService
  initialRequestToOwner = 'initialRequestToOwner',
  invitationError = 'invitationError',
  invitationReject = 'invitationReject',
  invitationAccept = 'invitationAccept',

  // SyncPubSubService
  dataChunk = 'dataChunk',
}

/**
 * Common pubsub service, that lets you subscribe as User and send messages to User.
 * Has no opinion or knowledge on message types or data being published. Made just to limit
 * the amount of channels in Redis at the same time.
 *
 * If you want to use it you need to define all the message types here in the enum.
 */
export class UserPubSubService {
  private static getUserChannel(userId: string) {
    return `user--${userId}`
  }

  /**
   * Publish update for a specific user
   * @param param0
   * @param param0.userId User that will get the message
   * @param param0.type Message type
   * @param param0.data Data to send
   */
  static async publishForUser({
    userId,
    socketId,
    data,
    type,
  }: {
    userId: string
    socketId?: string
    type: UserPubSubMessageTypes
    data: Object
  }) {
    return redisPubSub.publish({
      channel: this.getUserChannel(userId),
      publisherId: socketId || '',
      data: { type, data },
    })
  }

  static subscribeSocketForUser({
    socketId,
    userId,
    purpose,
    callback,
  }: {
    socketId: string
    userId: string
    purpose: string
    callback: (data: { type: UserPubSubMessageTypes; data: Object }) => void
  }) {
    return redisPubSub.subscribe({
      channels: [this.getUserChannel(userId)],
      subscriberId: socketId,
      callback,
      callbackKey: purpose,
    })
  }

  static unsubscribeSocketForUser({
    socketId,
    userId,
  }: {
    socketId: string
    userId: string
  }) {
    return redisPubSub.unsubscribe({
      channels: [this.getUserChannel(userId)],
      subscriberId: socketId,
    })
  }
}

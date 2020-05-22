import { redisPubSub } from '@/services/redis/pubSub'
import Wallet from '@/models/wallet.model'
import { WalletService } from './walletService'

export class WalletPubSubService {
  /**
   *
   * Wallet Updates
   *
   */
  private static channelWalletUpdates(userId: string) {
    return `wal-u--${userId}`
  }

  static async publishWalletUpdates({
    socketId,
    wallet,
  }: {
    socketId?: string
    wallet: Wallet
  }) {
    const userIds = await WalletService.getWalletUserIds(wallet.id)
    if (!userIds) return

    const promises = userIds.map(id =>
      redisPubSub.publish({
        channel: this.channelWalletUpdates(id),
        // Some updates come from REST api
        publisherId: socketId || '',
        data: wallet,
      }),
    )

    return Promise.all(promises)
  }

  static subscribeWalletUpdates({
    socketId,
    userId,
    callback,
  }: {
    socketId: string
    userId: string
    callback: (data: Wallet) => void
  }) {
    return redisPubSub.subscribe({
      channels: [this.channelWalletUpdates(userId)],
      subscriberId: socketId,
      callback,
    })
  }

  /**
   * Since it is called when socket is closed we unsubscribe user from everything at once.
   */
  static unsubscribe({
    socketId,
    userId,
  }: {
    socketId: string
    userId: string
  }) {
    return redisPubSub.unsubscribe({
      channels: [
        this.channelWalletUpdates(userId),
        this.channelWalletDeletes(userId),
      ],
      subscriberId: socketId,
    })
  }

  /**
   *
   * Wallet Destroys
   *
   */
  private static channelWalletDeletes(userId: string) {
    return `wal-d--${userId}`
  }

  static subscribeWalletDeletes({
    socketId,
    userId,
    callback,
  }: {
    socketId: string
    userId: string
    callback: (data: Wallet) => void
  }) {
    return redisPubSub.subscribe({
      channels: [this.channelWalletDeletes(userId)],
      subscriberId: socketId,
      callback,
    })
  }

  static publishWalletDestroy({
    walletId,
    connectedUserIds,
  }: {
    walletId: string
    connectedUserIds: string[]
  }) {
    const promises = connectedUserIds.map(id =>
      redisPubSub.publish({
        channel: this.channelWalletUpdates(id),
        publisherId: '',
        data: walletId,
      }),
    )

    return Promise.all(promises)
  }
}

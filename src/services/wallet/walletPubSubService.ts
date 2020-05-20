import { redisPubSub } from '@/services/redis/pubSub'
import Wallet from '@/models/wallet.model'
import { WalletService } from './walletService'

export class WalletPubSubService {
  private static channelWalletUpdates(userId: string) {
    return `wal-u--${userId}`
  }

  static async publishWalletUpdates({
    socketId,
    wallet,
  }: {
    socketId: string
    wallet: Wallet
  }) {
    const userIds = await WalletService.getWalletUserIds(wallet.id)
    if (!userIds) return

    return userIds.forEach(id =>
      redisPubSub.publish({
        channel: this.channelWalletUpdates(id),
        publisherId: socketId,
        data: wallet,
      }),
    )
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

  static unsubscribeWalletUpdates({
    socketId,
    userId,
  }: {
    socketId: string
    userId: string
  }) {
    return redisPubSub.unsubscribe({
      channels: [this.channelWalletUpdates(userId)],
      subscriberId: socketId,
    })
  }
}

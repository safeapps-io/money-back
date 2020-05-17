import { redisPubSub } from '@/services/redis/pubSub'
import Entity from '@/models/entity.model'
import { WalletService } from '../wallet/walletService'

export class SyncPubSubService {
  private static channelWalletUpdates(walletId: string) {
    return `wu--${walletId}`
  }

  static publishWalletUpdates({
    socketId,
    walletId,
    data,
  }: {
    socketId: string
    walletId: string
    data: Entity[]
  }) {
    return redisPubSub.publish({
      channel: this.channelWalletUpdates(walletId),
      publisherId: socketId,
      data,
    })
  }

  static async subscribeWalletUpdates({
    socketId,
    userId,
    callback,
  }: {
    socketId: string
    userId: string
    callback: (data: Entity[]) => void
  }) {
    const walletIds = await WalletService.getUserWalletIds(userId)

    return redisPubSub.subscribe({
      channels: walletIds.map(this.channelWalletUpdates),
      subscriberId: socketId,
      callback,
    })
  }

  static async unsubscribeWalletUpdates({
    socketId,
    userId,
  }: {
    socketId: string
    userId: string
  }) {
    const walletIds = await WalletService.getUserWalletIds(userId)

    return redisPubSub.unsubscribe({
      channels: walletIds.map(this.channelWalletUpdates),
      subscriberId: socketId,
    })
  }
}

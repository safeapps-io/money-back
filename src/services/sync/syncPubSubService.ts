import { redisPubSub } from '@/services/redis/pubSub'
import { WalletService } from '../wallet/walletService'
import Entity from '@/models/entity.model'

export class SyncPubSubService {
  private static channelEntitiesUpdates(walletId: string) {
    return `ent-u--${walletId}`
  }

  static publishEntitiesUpdates({
    socketId,
    walletId,
    data,
  }: {
    socketId: string
    walletId: string
    data: Entity[]
  }) {
    return redisPubSub.publish({
      channel: this.channelEntitiesUpdates(walletId),
      publisherId: socketId,
      data,
    })
  }

  static async subscribeEntitiesUpdates({
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
      channels: walletIds.map(this.channelEntitiesUpdates),
      subscriberId: socketId,
      callback,
    })
  }

  static async unsubscribeEntitiesUpdates({
    socketId,
    userId,
  }: {
    socketId: string
    userId: string
  }) {
    const walletIds = await WalletService.getUserWalletIds(userId)

    return redisPubSub.unsubscribe({
      channels: walletIds.map(this.channelEntitiesUpdates),
      subscriberId: socketId,
    })
  }
}

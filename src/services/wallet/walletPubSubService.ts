import Wallet from '@/models/wallet.model'

import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '@/services/user/userPubSubService'

export class WalletPubSubService {
  static async publishWalletUpdates({
    socketId,
    wallet,
  }: {
    socketId?: string
    wallet: Wallet
  }) {
    if (!wallet.users)
      throw new Error('You need to prefetch User model for WalletPubSubService')

    const userIds = wallet.users.map((data) => data.id),
      promises = userIds.map((userId) =>
        UserPubSubService.publishForUser({
          userId,
          socketId,
          type: UserPubSubMessageTypes.walletData,
          data: wallet,
        }),
      )

    return Promise.all(promises)
  }

  static publishWalletDestroy({
    walletId,
    connectedUserIds,
  }: {
    walletId: string
    connectedUserIds: string[]
  }) {
    const promises = connectedUserIds.map((userId) =>
      UserPubSubService.publishForUser({
        userId,
        type: UserPubSubMessageTypes.walletDelete,
        data: walletId,
      }),
    )

    return Promise.all(promises)
  }
}

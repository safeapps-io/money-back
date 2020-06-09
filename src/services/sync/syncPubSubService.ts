import Entity from '@/models/entity.model'
import Wallet from '@/models/wallet.model'

import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '../user/userPubSubService'

export class SyncPubSubService {
  static publishEntitiesUpdates({
    socketId,
    wallet,
    data,
  }: {
    socketId: string
    wallet: Wallet
    data: Entity[]
  }) {
    if (!wallet.users) throw new Error('Prefetch users!')

    return Promise.all(
      wallet.users.map((user) =>
        UserPubSubService.publishForUser({
          userId: user.id,
          socketId,
          type: UserPubSubMessageTypes.syncData,
          data,
        }),
      ),
    )
  }
}

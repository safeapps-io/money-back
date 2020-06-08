import { WSMiddleware } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import { WalletService } from './walletService'
import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '@/services/user/userPubSubService'

enum ITypes {
  getWallets = 'getWallets',
}

export type WalletIncomingMessages = {
  [ITypes.getWallets]: {}
}

enum OTypes {
  walletsUpdate = 'walletsUpdate',
  walletsDelete = 'walletsDelete',
}

const pubSubPurpose = 'wallet'

type M = WSMiddleware<WalletIncomingMessages, DefaultWsState>
export class WalletWsMiddleware implements M {
  static [ITypes.getWallets]: M[ITypes.getWallets] = async ({ wsWrapped }) => {
    if (!wsWrapped.state.user) return

    const wallets = await WalletService.getUserWallets(wsWrapped.state.user.id)
    wsWrapped.send({ type: OTypes.walletsUpdate, data: wallets })

    return UserPubSubService.subscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
      purpose: pubSubPurpose,
      callback: ({ type, data }) => {
        switch (type) {
          case UserPubSubMessageTypes.walletUpdate:
            wsWrapped.send({ type: OTypes.walletsUpdate, data })
            break

          case UserPubSubMessageTypes.walletDestroy:
            wsWrapped.send({ type: OTypes.walletsDelete, data })
            break
        }
      },
    })
  }

  static close: M['close'] = async wsWrapped => {
    if (!wsWrapped.state.user) return void 0

    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

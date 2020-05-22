import { WSMiddleware } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import { WalletPubSubService } from './walletPubSubService'
import { WalletService } from './walletService'

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

type M = WSMiddleware<WalletIncomingMessages, DefaultWsState>
export class WalletWsMiddleware implements M {
  static [ITypes.getWallets]: M[ITypes.getWallets] = async ({ wsWrapped }) => {
    if (!wsWrapped.state.user) return

    const wallets = await WalletService.getUserWallets(wsWrapped.state.user.id)
    wsWrapped.send({ type: OTypes.walletsUpdate, data: wallets })

    return Promise.all([
      WalletPubSubService.subscribeWalletUpdates({
        socketId: wsWrapped.id,
        userId: wsWrapped.state.user.id,
        callback: wallet => {
          wsWrapped.send({ type: OTypes.walletsUpdate, data: [wallet] })
        },
      }),
      WalletPubSubService.subscribeWalletDeletes({
        socketId: wsWrapped.id,
        userId: wsWrapped.state.user.id,
        callback: walletId => {
          wsWrapped.send({ type: OTypes.walletsDelete, data: walletId })
        },
      }),
    ])
  }

  static close: M['close'] = async wsWrapped => {
    if (!wsWrapped.state.user) return void 0

    return WalletPubSubService.unsubscribe({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

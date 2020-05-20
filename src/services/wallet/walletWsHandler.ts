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
}

type M = WSMiddleware<WalletIncomingMessages, DefaultWsState>
export class WalletWsMiddleware implements M {
  static [ITypes.getWallets]: M[ITypes.getWallets] = async ({ wsWrapped }) => {
    if (!wsWrapped.state.user) return

    const wallets = await WalletService.getUserWallets(wsWrapped.state.user.id)
    wsWrapped.send({ type: OTypes.walletsUpdate, data: wallets })

    WalletPubSubService.subscribeWalletUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
      callback: wallet => {
        wsWrapped.send({ type: OTypes.walletsUpdate, data: [wallet] })
      },
    })
  }

  static close: M['close'] = async wsWrapped => {
    if (!wsWrapped.state.user) return void 0

    return WalletPubSubService.unsubscribeWalletUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

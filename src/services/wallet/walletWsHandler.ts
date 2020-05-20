import { WSMiddleware } from '@/utils/wsMiddleware'
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

type M = WSMiddleware<WalletIncomingMessages>
export class WalletWsMiddleware implements M {
  static [ITypes.getWallets]: M[ITypes.getWallets] = async ({ wsWrapped }) => {
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

  static close: M['close'] = async wsWrapped =>
    WalletPubSubService.unsubscribeWalletUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
}

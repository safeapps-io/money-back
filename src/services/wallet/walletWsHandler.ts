import { WSMiddleware } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import { WalletService } from './walletService'
import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '@/services/user/userPubSubService'

enum ClientTypes {
  get = 'wallet/get',
}

export type WalletIncomingMessages = {
  [ClientTypes.get]: {}
}

enum BackTypes {
  all = 'wallet/all',
  single = 'wallet/single',
  delete = 'wallet/delete',
}

const pubSubPurpose = 'wallet'

type M = WSMiddleware<WalletIncomingMessages, DefaultWsState>
export class WalletWsMiddleware implements M {
  static [ClientTypes.get]: M[ClientTypes.get] = async ({ wsWrapped }) => {
    if (!wsWrapped.state.user) return

    const wallets = await WalletService.getUserWallets(wsWrapped.state.user.id)
    wsWrapped.send({ type: BackTypes.all, data: wallets })

    return UserPubSubService.subscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
      purpose: pubSubPurpose,
      callback: ({ type, data }) => {
        switch (type) {
          case UserPubSubMessageTypes.walletData:
            wsWrapped.send({ type: BackTypes.single, data })
            break

          case UserPubSubMessageTypes.walletDelete:
            wsWrapped.send({ type: BackTypes.delete, data })
            break
        }
      },
    })
  }

  static close: M['close'] = async (wsWrapped) => {
    if (!wsWrapped.state.user) return void 0

    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

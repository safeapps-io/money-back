import { WSMiddleware } from '@/utils/wsMiddleware'
import { DefaultWsState } from '@/services/types'
import { WalletService } from './walletService'
import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '@/services/user/userPubSubService'
import { subscribeOwnerForInviteValidation } from '../invite/inviteWsHandler'

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
    const wallets = await WalletService.getUserWallets(wsWrapped.userId)
    wsWrapped.send({ type: BackTypes.all, data: wallets })

    return Promise.all([
      subscribeOwnerForInviteValidation(wsWrapped),
      UserPubSubService.subscribeSocketForUser({
        socketId: wsWrapped.id,
        userId: wsWrapped.userId,
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
      }),
    ])
  }

  static close: M['close'] = async (wsWrapped) => {
    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.userId,
    })
  }
}

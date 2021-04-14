import { serializeModel, Serializers } from '@/models/serializers'
import Wallet from '@/models/wallet.model'
import { redisPubSub } from '../redis/pubSub'
import { WalletService } from './walletService'

const enum MessageTypes {
  all = 'all',
  single = 'single',
  delete = 'delete',
}

type WalletDataEvent = { type: MessageTypes.single; data: Wallet }
type WalletDestroyEvent = { type: MessageTypes.delete; data: string }

const callbackKey = 'wallet'

export const walletEventSender = async (
  userId: string,
  clientId: string,
  send: SSESender,
) => {
  const wallets = await WalletService.getUserWallets(userId)
  send({
    type: MessageTypes.all,
    data: serializeModel(wallets, Serializers.wallet),
  })

  const props = {
    channels: [redisPubSub.getUserChannel(userId)],
    clientId,
  }

  await redisPubSub.subscribe<WalletDataEvent | WalletDestroyEvent>({
    ...props,
    callbackKey,
    callback: send,
  })

  return () => redisPubSub.unsubscribe(props)
}

export const publishWalletUpdate = ({
    clientId,
    wallet,
  }: {
    clientId?: string
    wallet: Wallet
  }) => {
    if (!wallet.users)
      throw new Error('You need to prefetch User model for WalletPubSubService')

    const userIds = wallet.users.map((data) => data.id),
      data: WalletDataEvent = {
        type: MessageTypes.single,
        data: serializeModel(wallet, Serializers.wallet),
      }

    return Promise.all(
      userIds.map((userId) =>
        redisPubSub.publish({
          channel: redisPubSub.getUserChannel(userId),
          clientId,
          data,
          callbackKey,
        }),
      ),
    )
  },
  publishWalletDestroy = ({
    walletId,
    connectedUserIds,
  }: {
    walletId: string
    connectedUserIds: string[]
  }) => {
    return Promise.all(
      connectedUserIds.map((userId) =>
        redisPubSub.publish({
          channel: redisPubSub.getUserChannel(userId),
          data: walletId,
          callbackKey,
        }),
      ),
    )
  }

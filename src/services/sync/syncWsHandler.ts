import { WSMiddleware } from '@/utils/wsMiddleware'

import { SyncService } from './syncService'
import { ClientChangesData } from './types'
import { SyncPubSubService } from './syncPubSubService'

enum ITypes {
  clientChanges = 'clientChanges',
}

export type SyncIncomingMessages = {
  [ITypes.clientChanges]: ClientChangesData
}

enum OTypes {
  serverDataChunk = 'serverDataChunk',
  syncFinished = 'syncFinished',
}

type M = WSMiddleware<SyncIncomingMessages>
export class SyncWsMiddleware implements M {
  static [ITypes.clientChanges]: M[ITypes.clientChanges] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) throw new Error()

    const items = await SyncService.handleClientUpdates({
        userId: wsWrapped.state.user.id,
        socketId: wsWrapped.id,
        entityMap: message,
      }),
      finishCallback = () =>
        wsWrapped.send({
          type: OTypes.syncFinished,
          cb: () =>
            SyncPubSubService.subscribeWalletUpdates({
              socketId: wsWrapped.id,
              userId: wsWrapped.state.user.id,
              callback: data =>
                wsWrapped.send({ data, type: OTypes.serverDataChunk }),
            }),
        })

    wsWrapped.sequentialSend({
      type: OTypes.serverDataChunk,
      items,
      finishCallback,
    })
  }

  static close: M['close'] = async wsWrapped =>
    SyncPubSubService.unsubscribeWalletUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
}

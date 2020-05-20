import { WSMiddleware } from '@/utils/wsMiddleware'

import { SyncService } from './syncService'
import { ClientChangesData } from './types'
import { SyncPubSubService } from './syncPubSubService'
import { DefaultWsState } from '../types'

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

type M = WSMiddleware<SyncIncomingMessages, DefaultWsState>
export class SyncWsMiddleware implements M {
  static [ITypes.clientChanges]: M[ITypes.clientChanges] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    const userId = wsWrapped.state.user.id

    const items = await SyncService.handleClientUpdates({
        userId,
        socketId: wsWrapped.id,
        entityMap: message,
      }),
      finishCallback = () =>
        wsWrapped.send({
          type: OTypes.syncFinished,
          cb: () =>
            SyncPubSubService.subscribeEntitiesUpdates({
              userId,
              socketId: wsWrapped.id,
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

  static close: M['close'] = async wsWrapped => {
    if (!wsWrapped.state.user) return void 0

    return SyncPubSubService.unsubscribeEntitiesUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

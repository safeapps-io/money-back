import { WSMiddleware } from '@/utils/wsMiddleware'

import { SyncService } from './syncService'
import { ClientChangesData } from './types'
import { DefaultWsState } from '../types'
import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '../user/userPubSubService'

enum ITypes {
  clientData = 'sync/data',
}

export type SyncIncomingMessages = {
  [ITypes.clientData]: ClientChangesData
}

enum OTypes {
  backData = 'sync/data',
  finished = 'sync/finished',
}

const pubSubPurpose = 'sync'

type M = WSMiddleware<SyncIncomingMessages, DefaultWsState>
export class SyncWsMiddleware implements M {
  static [ITypes.clientData]: M[ITypes.clientData] = async ({
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
          type: OTypes.finished,
          cb: () =>
            UserPubSubService.subscribeSocketForUser({
              userId,
              socketId: wsWrapped.id,
              purpose: pubSubPurpose,
              callback: ({ data, type }) => {
                switch (type) {
                  case UserPubSubMessageTypes.syncData:
                    wsWrapped.send({ data, type: OTypes.backData })
                }
              },
            }),
        })

    wsWrapped.sequentialSend({
      type: OTypes.backData,
      items,
      finishCallback,
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

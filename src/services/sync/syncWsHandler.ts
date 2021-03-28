import { WSMiddleware } from '@/utils/wsMiddleware'

import { SyncService } from './syncService'
import { ClientChangesData } from './types'
import { DefaultWsState } from '@/services/types'
import {
  UserPubSubService,
  UserPubSubMessageTypes,
} from '@/services/user/userPubSubService'

enum ClientTypes {
  clientData = 'sync/data',
}

export type SyncIncomingMessages = {
  [ClientTypes.clientData]: ClientChangesData
}

enum BackTypes {
  backData = 'sync/data',
  finished = 'sync/finished',
}

const pubSubPurpose = 'sync'

type M = WSMiddleware<SyncIncomingMessages, DefaultWsState>
export class SyncWsMiddleware implements M {
  static [ClientTypes.clientData]: M[ClientTypes.clientData] = async ({
    wsWrapped,
    message,
  }) => {
    const userId = wsWrapped.userId

    const items = await SyncService.handleClientUpdates({
        userId,
        socketId: wsWrapped.id,
        entityMap: message,
      }),
      finishCallback = () =>
        wsWrapped.send({
          type: BackTypes.finished,
          cb: () =>
            UserPubSubService.subscribeSocketForUser({
              userId,
              socketId: wsWrapped.id,
              purpose: pubSubPurpose,
              callback: ({ data, type }) => {
                switch (type) {
                  case UserPubSubMessageTypes.syncData:
                    wsWrapped.send({ data, type: BackTypes.backData })
                }
              },
            }),
        })

    wsWrapped.sequentialSend({
      type: BackTypes.backData,
      items,
      finishCallback,
    })
  }

  static close: M['close'] = async (wsWrapped) => {
    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.userId,
    })
  }
}

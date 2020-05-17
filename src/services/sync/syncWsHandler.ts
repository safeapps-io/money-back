import { WSMiddleware } from '@/utils/wsMiddleware'

import { SyncService } from './syncService'
import { ClientChangesData } from './types'

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
    state,
  }) => {
    if (!state.user) throw new Error()

    const items = await SyncService.handleClientUpdates({
      userId: state.user.id,
      entityMap: message,
    })

    wsWrapped.sequentialSend({
      type: OTypes.serverDataChunk,
      items,
      finishMessage: {
        type: OTypes.syncFinished,
      },
    })
  }
}

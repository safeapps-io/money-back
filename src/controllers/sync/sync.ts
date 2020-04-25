import { WSMiddleware } from '@/utils/wsMiddleware'
import { ObjectTypes, syncMap } from '@/core/syncEngine'
import Transaction from '@/models/transaction.model'
import Category from '@/models/category.model'
import SearchFilter from '@/models/searchFilter.model'

enum ITypes {
  clientChanges = 'clientChanges',
}

type EntityItem = {
  type: ObjectTypes
  ent: Transaction | Category | SearchFilter
}

type ClientChangesData = {
  latestUpdated?: string | number
  entities: EntityItem[]
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
  static [ITypes.clientChanges]: M[ITypes.clientChanges] = async (
    wsWrapped,
    message,
    state,
  ) => {
    if (!state.user) throw new Error()

    const latestUpdated = message.latestUpdated || 0
    const entities: EntityItem[] = message.entities || []

    const changedItems = (
      await Promise.all(
        entities.map(({ type, ent }) => syncMap[type].syncRunner(ent)),
      )
    ).filter(Boolean)

    // TODO: Вот это с помощью редиса надо делать. Надо делать publish в каналы
    // if (changedItems.length)
    //   wsWrapped.sendToAllExceptId(
    //     wsId,
    //     BackendSyncMessageTypes.serverDataChunk,
    //     changedItems,
    //   )

    const changedDate = new Date(latestUpdated)
    const items = (
      await Promise.all(
        Object.values(ObjectTypes).map(type =>
          syncMap[type].getUpdates(changedDate),
        ),
      )
    ).flatMap(i => i)

    wsWrapped.sequentialSend({
      type: OTypes.serverDataChunk,
      items,
      finishMessage: {
        type: OTypes.syncFinished,
      },
    })
  }
}

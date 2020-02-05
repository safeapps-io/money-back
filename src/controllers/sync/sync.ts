import { BackendMessageTypes, MessageHandler } from './types'
import { ObjectTypes, syncMap } from '@/core/syncEngine'
import Transaction from '@/models/transaction.model'
import Category from '@/models/category.model'
import SearchFilter from '@/models/searchFilter.model'

const syncMessageHandler: MessageHandler = async (
  ws,
  wsId,
  parsed = {} as ClientChangesData,
) => {
  const latestUpdated = parsed.latestUpdated || 0
  const entities: EntityItem[] = parsed.entities || []

  const changedItems = (
    await Promise.all(
      entities.map(({ type, ent }) => syncMap[type].syncRunner(ent)),
    )
  ).filter(Boolean)

  if (changedItems.length)
    ws.sendToAllExceptId(
      wsId,
      BackendMessageTypes.serverDataChunk,
      changedItems,
    )

  const changedDate = new Date(latestUpdated)
  const items = (
    await Promise.all(
      Object.values(ObjectTypes).map(type =>
        syncMap[type].getUpdates(changedDate),
      ),
    )
  ).flatMap(i => i)

  ws.sequentialSend(wsId, BackendMessageTypes.serverDataChunk, items, {
    type: BackendMessageTypes.syncFinished,
  })
}

export default syncMessageHandler

type EntityItem = {
  type: ObjectTypes
  ent: Transaction | Category | SearchFilter
}

type ClientChangesData = {
  latestUpdated?: string | number
  entities: EntityItem[]
}

import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'
import cookieParser from 'cookie-parser'
import nanoid from 'nanoid'
import * as ws from 'ws'

import { isWsAuth } from '@/middlewares/isAuth'
import Category from '@/models/category.model'
import Transaction from '@/models/transaction.model'
import SearchFilter from '@/models/searchFilter.model'
import { syncMap, ObjectTypes } from '@/core/syncEngine'
import chunk from '@/utils/chunk'

/** A map of id to websocket objects */
const wsClients = {} as { [id: string]: ws }

/**
 * Sends serialized data to websocket
 * @param ws Websocket that'll get the message
 * @param data Data to send
 */
const send = (ws: ws, data: Object) => ws.send(JSON.stringify(data))

/**
 * Sends data to every websocket except passed ID
 * @param id Id, that needs to be ignores
 * @param data Data to be sent
 */
const sendToAllExceptId = (id: string, data: Object) =>
  Object.entries(wsClients).forEach(([otherId, otherWs]) => {
    if (otherId !== id) send(otherWs, data)
  })

/**
 * Send the array data sequentially from index 0 to latest index
 * @param ws Websocket that'll get the message
 * @param items An array of arrays that needs to be sent
 * @param startIndex Starting index for the sending. If it is not passed, then the whole process starts from 0 index
 */
const sequentialSend = (ws: ws, items: Array<EntityItem[]>, startIndex = 0) =>
  ws.send(JSON.stringify(getServerDataChunkObject(items[startIndex])), () => {
    if (items[startIndex + 1]) sequentialSend(ws, items, startIndex + 1)
    else send(ws, { type: MessageTypes.syncFinished })
  })

/**
 * Forms an object of type `serverDataChunk` (just for reusability)
 * @param items List of items to be decorated
 */
const getServerDataChunkObject = (
  items: EntityItem[] = [],
): ServerDataChunk => ({
  type: MessageTypes.serverDataChunk,
  data: items,
})

const syncRouter = (Router() as WSRouter).use(cookieParser())
syncRouter.ws('/:sessionId/sync', isWsAuth, (ws, req) => {
  const wsId = nanoid()
  wsClients[wsId] = ws

  ws.on('message', async raw => {
    let parsed
    try {
      parsed = JSON.parse(raw as string) as ClientChangesData
      if (parsed.type !== MessageTypes.clientChanges)
        throw new Error(`Unknown message type: ${parsed.type}`)

      const { latestUpdated = 0, entities = [] } = parsed.data || {}

      const changedItems = (
        await Promise.all(
          entities.map(({ type, ent }) => syncMap[type].syncRunner(ent)),
        )
      ).filter(Boolean) as EntityItem[]

      if (changedItems.length)
        sendToAllExceptId(wsId, getServerDataChunkObject(changedItems))

      const changedDate = new Date(latestUpdated)
      const items = (
        await Promise.all(
          Object.values(ObjectTypes).map(type =>
            syncMap[type].getUpdates(changedDate),
          ),
        )
      ).flatMap(i => i)

      sequentialSend(ws, chunk(items, 100))
    } catch (e) {
      send(ws, { type: MessageTypes.error, data: e.message })
      req.log.warn(e)
      return ws.terminate()
    }
  })

  ws.on('close', () => delete wsClients[wsId])
})

export default syncRouter

type EntityItem = {
  type: ObjectTypes
  ent: Transaction | Category | SearchFilter
}

enum MessageTypes {
  /** Client -> Backend: set of updated data */
  clientChanges = 'clientChanges',
  /** Backend -> Client: set of updated data */
  serverDataChunk = 'serverDataChunk',
  /** Backend -> Client: sync process has been finished */
  syncFinished = 'syncFinished',
  /** Backend -> Client: error message */
  error = 'error',
}

type ClientChangesData = {
  type: MessageTypes.clientChanges
  data: {
    latestUpdated?: string | number
    entities: EntityItem[]
  }
}
type ServerDataChunk = {
  type: MessageTypes.serverDataChunk
  data: EntityItem[]
}

/**
 * TODO: Напрашивается закрыть чистый ws.send и ws.on какими-то промежуточными интерфейсами.
 * Из очевидного:
 * - автоматическое формирование объекта заданной формы: `{type: '', data: { ответ }}`
 * - обработка ошибок, отлов ошибок и формирование текста ошибки
 * - автоматическая сериализация в и из JSON
 * - многофункциональные хелперы, типа `sequentialSend` в одном общем месте
 */

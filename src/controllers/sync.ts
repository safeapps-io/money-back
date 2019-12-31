import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'
import cookieParser from 'cookie-parser'
import nanoid from 'nanoid'
import * as ws from 'ws'

import { isWsAuth } from '@/middlewares/isAuth'
import Category, { getCategoryUpdates } from '@/models/category.model'
import Transaction, { getTransactionUpdates } from '@/models/transaction.model'
import SearchFilter, {
  getSearchFilterUpdates,
} from '@/models/searchFilter.model'
import chunk from '@/utils/chunk'

/** A map of id to websockets */
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
function sequentialSend<T>(ws: ws, items: Array<T[]>, startIndex = 0) {
  ws.send(JSON.stringify(items[startIndex]), () => {
    if (items[startIndex + 1]) sequentialSend(ws, items, startIndex + 1)
  })
}

const syncRouter = (Router() as WSRouter).use(cookieParser())
syncRouter.ws('/sync', isWsAuth, (ws, req) => {
  const id = nanoid()

  ws.on('message', async (raw: string) => {
    let parsed
    try {
      parsed = JSON.parse(raw) as ClientChangesData
      if (parsed.type !== 'clientChanges') throw new Error()
    } catch (e) {
      return ws.terminate()
    }
    wsClients[id] = ws

    const { latestUpdated = 0, entities = [] } = parsed.data || {}
    if (entities.length) {
      // Здесь логика про сохранение данных
    }

    const changedDate = new Date(latestUpdated)
    const items = (
      await Promise.all([
        getSearchFilterUpdates(changedDate),
        getCategoryUpdates(changedDate),
        getTransactionUpdates(changedDate),
      ])
    ).flatMap(i => i)

    // Sending all the data split in chunks of 100 items
    sequentialSend(ws, chunk(items, 100))
  })

  ws.on('close', () => delete wsClients[id])
})

export default syncRouter

type ClientChangesData = {
  type: 'clientChanges'
  data: {
    latestUpdated?: string | number
    entities: Array<Category | Transaction | SearchFilter>
  }
}

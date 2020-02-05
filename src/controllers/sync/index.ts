import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'
import cookieParser from 'cookie-parser'

import { isWsAuth } from '@/middlewares/isAuth'
import { BackendMessageTypes, ClientMessageTypes } from './types'
import WSSendHelper from '@/utils/wsSendWrapper'
import syncMessageHandler from './sync'
import mccCodeMessageHandler from './mcc'

const syncWsHandler = new WSSendHelper<BackendMessageTypes>()

const syncRouter = (Router() as WSRouter).use(cookieParser())
syncRouter.ws('/:sessionId/sync', isWsAuth, (ws, req) => {
  syncWsHandler.handleConnection(
    ws,
    (id, parsed) => {
      switch (parsed.type) {
        case ClientMessageTypes.clientChanges:
          syncMessageHandler(syncWsHandler, id, parsed.data)
          break

        case ClientMessageTypes.clientMCCDescription:
          mccCodeMessageHandler(syncWsHandler, id, parsed.data)
          break

        default:
          throw new Error(`Unknown message type: ${parsed.type}`)
      }
    },
    (err, id, raw) => {
      syncWsHandler.send(id, BackendMessageTypes.error, err.message)
      req.log.warn(err, raw)
    },
  )
})

export default syncRouter

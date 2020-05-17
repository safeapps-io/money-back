import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'

import { handleWsConnection } from '@/utils/wsMiddleware'
import { AuthWsMiddleware, AuthIncomingMessages } from '@/controllers/sync/auth'
import {
  SyncWsMiddleware,
  SyncIncomingMessages,
} from '@/services/sync/syncWsHandler'
import {
  MCCIncomingMessages,
  MCCWsMiddleware,
} from '@/services/mcc/mccWsHandler'

const syncRouter = Router() as WSRouter
syncRouter.ws('/sync', ws => {
  handleWsConnection<
    AuthIncomingMessages & SyncIncomingMessages & MCCIncomingMessages
  >(ws, AuthWsMiddleware, SyncWsMiddleware, MCCWsMiddleware)
})

export default syncRouter

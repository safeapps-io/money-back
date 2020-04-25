import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'

import { handleWsConnection } from '@/utils/wsMiddleware'
import { AuthWsMiddleware, AuthIncomingMessages } from '@/controllers/sync/auth'
import { SyncWsMiddleware, SyncIncomingMessages } from '@/controllers/sync/sync'
import { MCCWsMiddleware, MCCIncomingMessages } from '@/controllers/sync/mcc'

const syncRouter = Router() as WSRouter
syncRouter.ws('/sync', ws => {
  handleWsConnection<
    AuthIncomingMessages & SyncIncomingMessages & MCCIncomingMessages
  >(ws, AuthWsMiddleware, SyncWsMiddleware, MCCWsMiddleware)
})

export default syncRouter

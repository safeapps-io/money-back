import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'

import { handleWsConnection } from '@/utils/wsMiddleware'

import {
  UserIncomingMessages,
  UserWsMiddleware,
} from '@/services/user/userWsHandler'
import {
  SyncWsMiddleware,
  SyncIncomingMessages,
} from '@/services/sync/syncWsHandler'
import {
  MCCIncomingMessages,
  MCCWsMiddleware,
} from '@/services/mcc/mccWsHandler'
import {
  WalletWsMiddleware,
  WalletIncomingMessages,
} from '@/services/wallet/walletWsHandler'

const syncRouter = Router() as WSRouter
syncRouter.ws('/sync', ws => {
  handleWsConnection<
    UserIncomingMessages &
      WalletIncomingMessages &
      SyncIncomingMessages &
      MCCIncomingMessages
  >(ws, UserWsMiddleware, WalletWsMiddleware, SyncWsMiddleware, MCCWsMiddleware)
})

export default syncRouter

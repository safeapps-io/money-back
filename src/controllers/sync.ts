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
import User from '@/models/user.model'
import {
  InviteIncomingMessages,
  InviteWsMiddleware,
} from '@/services/invite/inviteWsHandler'
import {
  SimpleSyncIncomingMessages,
  SimpleSyncWsMiddleware,
} from '@/services/simpleUpdatedSync/simpleSyncWsHandler'

const syncRouter = Router() as WSRouter
syncRouter.ws('/sync/:ticket', (ws, req) => {
  try {
    handleWsConnection<
      UserIncomingMessages &
        WalletIncomingMessages &
        SyncIncomingMessages &
        InviteIncomingMessages &
        MCCIncomingMessages &
        SimpleSyncIncomingMessages,
      { user?: User }
    >(
      ws,
      req.params.ticket,
      UserWsMiddleware,
      WalletWsMiddleware,
      SyncWsMiddleware,
      InviteWsMiddleware,
      MCCWsMiddleware,
      SimpleSyncWsMiddleware,
    )
  } catch (error) {
    ws.terminate()
  }
})

export default syncRouter

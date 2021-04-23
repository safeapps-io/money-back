import { Router } from 'express'

import { sse } from '@/middlewares/sse'
import { isRestAuth } from '@/middlewares/isAuth'

import { syncEventSender } from '@/services/sync/syncEvents'
import { userEventSender } from '@/services/user/userEvents'
import { walletEventSender } from '@/services/wallet/walletEvents'
import { inviteEventSender } from '@/services/invite/inviteEvents'
import { chargeEventSender } from '@/services/billing/billingEvents'
import { pingEventSender } from '@/services/pingSse'

export const sseRouter = Router()
  .use(isRestAuth())
  .get<{ clientId: string }>(
    '',
    sse([
      userEventSender,
      walletEventSender,
      syncEventSender,
      inviteEventSender,
      chargeEventSender,
      pingEventSender,
    ]),
  )

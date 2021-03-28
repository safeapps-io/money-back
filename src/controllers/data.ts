import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { SyncService } from '@/services/sync/syncService'
import { isPlanActive } from '@/middlewares/isPlanActive'

export const dataRouter = Router()

dataRouter.delete<{}, {}, { [walletId: string]: string[] }>(
  '/entity',
  isRestAuth(),
  isPlanActive(),
  ash(async (req, res) => {
    await SyncService.deleteEntitiesById({
      userId: req.userId,
      deleteMap: req.body,
    })
    res.json({})
  }),
)

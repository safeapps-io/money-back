import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { SyncService } from '@/services/sync/syncService'

export const dataRouter = Router()

dataRouter.delete(
  '/entity',
  isRestAuth(),
  ash(async (req, res) => {
    const deleteMap = req.body as { [walletId: string]: string[] }
    await SyncService.deleteEntitiesById({ userId: req.userId, deleteMap })
    res.json({})
  }),
)

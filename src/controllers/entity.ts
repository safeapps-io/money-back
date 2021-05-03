import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { SyncService } from '@/services/sync/syncService'
import { ClientChangesData } from '@/services/sync/types'
import Entity from '@/models/entity.model'
import { serializeModel, Serializers } from '@/models/serializers'

export const entityRouter = Router()
  .use(isRestAuth())
  .post<{}, Entity[], ClientChangesData>(
    '',
    ash(async (req, res) => {
      const items = await SyncService.handleClientUpdates({
        userId: req.userId,
        entityMap: req.body,
        clientId: req.sse.clientId,
      })

      /**
       * TODO:
       *
       * Possibly we would want to use streams here. Instead of just sending a lot of
       * entities at once, we could send them in chunks of 100 items to the client,
       * making it possible to sync 1000s of entities at once without overloading
       * the client and the network.
       *
       * Or at the very least some pagination.
       */
      return res.json(serializeModel(items, Serializers.entity))
    }),
  )
  .delete<{}, {}, { [walletId: string]: string[] }>(
    '',
    ash(async (req, res) => {
      await SyncService.deleteEntitiesById({
        userId: req.userId,
        deleteMap: req.body,
      })
      res.json({})
    }),
  )

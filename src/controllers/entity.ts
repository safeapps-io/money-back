import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { SyncService } from '@/services/sync/syncService'
import { isPlanActive } from '@/middlewares/isPlanActive'
import { ClientChangesData } from '@/services/sync/types'
import { serializeModel, Serializers } from '@/models/serializers'
import { sse } from '@/middlewares/sse'
import { syncEventSender } from '@/services/sync/syncEvents'

export const entityRouter = Router().use(isRestAuth())

entityRouter
  .use(isPlanActive())
  .route('')
  .post(
    ash(async (req, res) => {
      const body = req.body as {
        clientId: string
        data: ClientChangesData
      }

      const items = await SyncService.handleClientUpdates({
        userId: req.userId,
        entityMap: body.data,
        clientId: body.clientId,
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
  .delete(
    ash(async (req, res) => {
      const body = req.body as { [walletId: string]: string[] }

      await SyncService.deleteEntitiesById({
        userId: req.userId,
        deleteMap: body,
      })
      res.json({})
    }),
  )

entityRouter.get('/updates', sse(syncEventSender))

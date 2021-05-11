import { Router } from 'express'
import { json } from 'body-parser'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { BillingService } from '@/services/billing/billingService'
import { ChargeProviders } from '@/models/billing/chargeEvent.model'
import { TinkoffClientDataReturn } from '@/services/billing/tinkoffProvider'
import { CoinbaseClientDataReturn } from '@/services/billing/coinbaseProvider'
import Plan from '@/models/billing/plan.model'
import { serializeModel, Serializers } from '@/models/serializers'

export const billingRouter = Router()

billingRouter.get<{}, Plan>(
  '/plan',
  isRestAuth(),
  ash(async (req, res) => {
    const result = await BillingService.getFullPlanDataByUserId(req.userId)
    return res.json(serializeModel(result, Serializers.planFull))
  }),
)

billingRouter
  .use(
    json({
      verify: (req, _, buf) => {
        ;(req as any).rawBody = buf.toString('utf-8')
      },
    }),
  )
  .post<
    { provider: ChargeProviders },
    TinkoffClientDataReturn | CoinbaseClientDataReturn
  >(
    '/charge/:provider',
    isRestAuth(),
    ash(async (req, res) => {
      const result = await BillingService.createCharge(
        req.userId,
        req.params.provider,
      )

      return res.json(result)
    }),
  )
  .post<{ provider: ChargeProviders }>(
    '/webhook/:provider',
    ash(async (req, res) => {
      const provider = req.params.provider
      await BillingService.handleEvent({
        provider,
        event: req.body,
        rawRequestData: req.rawBody!,
        headers: req.headers,
      })

      return res.status(200).end()
    }),
  )

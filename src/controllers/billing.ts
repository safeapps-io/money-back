import { Router } from 'express'
import { json } from 'body-parser'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { BillingService } from '@/services/billing/billingService'
import { ChargeProviders } from '@/models/billing/chargeEvent.model'

export const userBillingRouter = Router().get(
  '/plans',
  isRestAuth(),
  ash(async (req, res) => {
    const result = await BillingService.getFullPlanDataByUserId(req.userId)
    return res.json(result)
  }),
)

export const billingProviderRouter = Router()
  .use(
    json({
      verify: (req, _, buf) => {
        ;(req as any).rawBody = buf.toString('utf-8')
      },
    }),
  )
  .post<{ provider: ChargeProviders }>(
    '/charge/:provider',
    ash(async (req, res) => {
      await BillingService.createCharge(req.userId, req.params.provider)

      return res.json({})
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

      return res.status(200)
    }),
  )

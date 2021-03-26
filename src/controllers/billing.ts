import { Router } from 'express'
import { json } from 'body-parser'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { BillingService } from '@/services/billing/billingService'

export const billingRouter = Router().use(isRestAuth())

billingRouter.get(
  '/plans',
  ash(async (req, res) => {
    const result = await BillingService.getFullPlanDataByUserId(req.userId)
    return res.json(result)
  }),
)

billingRouter.post(
  '/charge/:provider',
  ash(async (req, res) => {
    await BillingService.createCharge(req.userId, req.params.provider)

    return res.json({})
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
  .post(
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

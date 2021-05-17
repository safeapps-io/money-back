import { Router } from 'express'
import csurf from 'csurf'
import ash from 'express-async-handler'

import { ExchangeRateService } from '@/services/billing/exchangeRate'

export const adminRatesRouter = Router()
  .use(csurf({ cookie: true }))
  .get(
    '',
    ash(async (req, res) =>
      res.render('rates', {
        csrfToken: req.csrfToken(),
        rateData: await ExchangeRateService.getExchangeRate(),
      }),
    ),
  )
  .post(
    '',
    ash(async (_, res) => {
      await ExchangeRateService.updateExchangeRate()
      return res.redirect('/rates')
    }),
  )

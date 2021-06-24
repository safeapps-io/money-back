import { Router } from 'express'
import csurf from 'csurf'
import ash from 'express-async-handler'

import { ExchangeRateService } from '@/services/billing/exchangeRate'
import * as LimitService from '@/services/billing/limitService'
import { MetaCategoryManager } from '@/models/metaCategory.model'

const rootPath = '/misc/'

export const adminMiscRouter = Router()
  .use(csurf({ cookie: true }))
  .get(
    '',
    ash(async (req, res) =>
      res.render('misc', {
        csrfToken: req.csrfToken(),
        rootPath,
        rateData: await ExchangeRateService.getExchangeRate(),
        limit: await LimitService.getRawLimit(),
        realLimit: await LimitService.getRealLimit(),
        metaCategoryCount: await MetaCategoryManager.count(),
      }),
    ),
  )
  .post(
    '/rate',
    ash(async (_, res) => {
      await ExchangeRateService.updateExchangeRate()
      return res.redirect(rootPath)
    }),
  )
  .post(
    '/limit',
    ash(async (req, res) => {
      await LimitService.setLimit(req.body.newLimit)
      return res.redirect(rootPath)
    }),
  )

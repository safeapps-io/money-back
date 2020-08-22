import { Router } from 'express'

import { isRestAuth } from '@/middlewares/isAuth'
import { getCurrencyList } from '@/services/directory/currency'

export const directoryRouter = Router()

directoryRouter.get('/currency/all', isRestAuth, (_, res) =>
  res.set(`Cache-Control', 'public, max-age=${60 * 5}`).json(getCurrencyList()),
)

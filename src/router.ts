import { Router } from 'express'

import { apiRouter } from '@/controllers'
import { adminRouter } from '@/controllers/admin'
import { billingRouter } from '@/controllers/billing'
import { errorHandler } from './middlewares/errorHandler'

export const router = Router()
  .use('/api', apiRouter)
  .use('/admin', adminRouter)
  .use('/billing', billingRouter)
  .use((_, res) => res.status(404).json({ error: 'No such path' }))
  .use(errorHandler)

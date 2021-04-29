import { Router } from 'express'

import { errorHandler } from '@/middlewares/errorHandler'

import { apiRouter } from '@/controllers'
import { adminRouter } from '@/controllers/admin'
import { billingRouter } from '@/controllers/billing'
import { reportErrorProxy } from '@/controllers/reportError'

export const router = Router()
  .use('/api', apiRouter)
  .use('/admin', adminRouter)
  .use('/billing', billingRouter)
  .post('/report-error/:path', reportErrorProxy)
  .use((_, res) => res.status(404).json({ error: 'No such path' }))
  .use(errorHandler)

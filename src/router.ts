import { Router } from 'express'

import { apiRouter } from '@/controllers'
import { syncRouter } from '@/controllers/sync'
import { adminRouter } from '@/controllers/admin'
import { billingRouter } from '@/controllers/billing'

export const router = Router()
  .use('/ws', syncRouter)
  .use('/api', apiRouter)
  .use('/admin', adminRouter)
  .use('/billing', billingRouter)

import { Router } from 'express'

import { adminErrorHandler } from '@/admin/middlewares/adminErrorHandler'
import { isAdmin } from '@/admin/middlewares/isAdmin'

import { adminAuthRouter } from './auth'
import { adminDashboardRouter } from './dashboard'
import { adminMccRouter } from './mcc'
import { adminUserRouter } from './users'
import { adminRatesRouter } from './rates'

export const adminRouter = Router()

adminRouter
  .get('/', (_, res) => res.redirect('/dashboard'))
  .use('/auth', adminAuthRouter)
  .use(isAdmin)
  .use('/dashboard', adminDashboardRouter)
  .use('/mcc', adminMccRouter)
  .use('/users', adminUserRouter)
  .use('/rates', adminRatesRouter)
  .use(adminErrorHandler)

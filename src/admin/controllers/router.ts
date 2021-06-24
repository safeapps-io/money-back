import { Router } from 'express'

import { adminErrorHandler } from '@/admin/middlewares/adminErrorHandler'
import { isAdmin } from '@/admin/middlewares/isAdmin'

import { adminAuthRouter } from './auth'
import { adminDashboardRouter } from './dashboard'
import { adminMccRouter } from './mcc'
import { adminUserRouter } from './users'
import { adminMiscRouter } from './misc'
import { adminBullRouter } from './bull'
import { adminMetaCategoryRouter } from './metaCategory'

export const adminRouter = Router()

adminRouter
  .get('/', (_, res) => res.redirect('/dashboard'))
  .use('/auth', adminAuthRouter)
  .use(isAdmin)
  .use('/dashboard', adminDashboardRouter)
  .use('/mcc', adminMccRouter)
  .use('/users', adminUserRouter)
  .use('/misc', adminMiscRouter)
  .use('/meta-category', adminMetaCategoryRouter)
  .use('/bull', adminBullRouter)
  .use(adminErrorHandler)

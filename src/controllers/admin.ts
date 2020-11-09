import { Router } from 'express'

import { setCrudOnRouter } from '@/utils/crudMiddleware'

import { isAdmin, isRestAuth } from '@/middlewares/isAuth'
import { SchemeManager } from '@/models/scheme.model'
import { MetaCategoryManager } from '@/models/metaCategory.model'

export const adminRouter = Router().use(isRestAuth).use(isAdmin)

adminRouter
  .use('/scheme', setCrudOnRouter(SchemeManager))
  .use('/metaCategory', setCrudOnRouter(MetaCategoryManager))

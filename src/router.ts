import { Router } from 'express'
import apiRouter from '@/controllers/api'
import adminRouter from '@/controllers/admin'

const router = Router()
  .use('/api', apiRouter)
  .use('/admin', adminRouter)

export default router

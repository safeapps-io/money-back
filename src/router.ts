import { Router } from 'express'
import apiRouter from '@/controllers'
import syncRouter from '@/controllers/sync'

const router = Router()
  .use('/ws', syncRouter)
  .use('/api', apiRouter)

export default router

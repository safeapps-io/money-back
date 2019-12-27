import { Router } from 'express'
import apiRouter from '@/controllers'

const router = Router().use('/api', apiRouter)

export default router

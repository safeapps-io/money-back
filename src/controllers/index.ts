import { Router } from 'express'

import { errorHandler } from '@/middlewares/errorHandler'
import authRouter from '@/controllers/auth'

const apiRouter = Router()

apiRouter
  .use('/auth', authRouter)
  .use((_, res) =>
    res
      .status(404)
      .json({ error: 'No such path' })
      .end(),
  )
  .use(errorHandler)

export default apiRouter

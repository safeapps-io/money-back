import { Router } from 'express'

import { errorHandler } from '@/middlewares/errorHandler'

import { authRouter } from '@/controllers/auth'
import { dataRouter } from '@/controllers/data'
import { walletRouter } from '@/controllers/wallet'
import { directoryRouter } from '@/controllers/directory'

const apiRouter = Router()

apiRouter
  .use('/auth', authRouter)
  .use('/wallet', walletRouter)
  .use('/data', dataRouter)
  .use('/directory', directoryRouter)
  .use((_, res) => res.status(404).json({ error: 'No such path' }).end())
  .use(errorHandler)

export default apiRouter

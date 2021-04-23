import { Router } from 'express'

import { authRouter } from '@/controllers/auth'
import { entityRouter } from '@/controllers/entity'
import { walletRouter } from '@/controllers/wallet'
import { directoryRouter } from '@/controllers/directory'
import { sseRouter } from '@/controllers/sse'

export const apiRouter = Router()
  .use('/auth', authRouter)
  .use('/wallet', walletRouter)
  .use('/entity', entityRouter)
  .use('/directory', directoryRouter)
  .use('/sse', sseRouter)

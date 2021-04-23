import { Router } from 'express'
import { inviteRouter } from './invite'
import { newUserRouter } from './newUser'
import { authorizedPasswordRouter, resetPasswordRouter } from './password'

import { sessionsRouter } from './sessions'
import { userRouter } from './user'

export const authRouter = Router()
  .use('', newUserRouter)
  .use('/user', userRouter)
  .use('/user/session', sessionsRouter)
  .use('/user/password', authorizedPasswordRouter)
  .use('/reset-password', resetPasswordRouter)
  .use('/invite', inviteRouter)

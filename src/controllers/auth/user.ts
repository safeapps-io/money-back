import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth, resetCookies } from '@/middlewares/isAuth'
import { UserService } from '@/services/user/userService'
import { UserManager } from '@/models/user.model'
import { serializeModel, Serializers } from '@/models/serializers'
import * as LimitService from '@/services/billing/limitService'

export const userRouter = Router()

userRouter.get(
  '/init',
  isRestAuth(),
  ash(async (req, res) => {
    const [user, limit] = await Promise.all([
      UserManager.byIdWithDataIncluded(req.userId),
      LimitService.getRealLimit(),
    ])

    res.json({
      user: serializeModel(user!, Serializers.userFull),
      settings: { limit },
    })
  }),
)

userRouter
  .route('')
  .patch(
    isRestAuth(true),
    ash(async (req, res) => {
      const body = req.body as
        | { username: string }
        | { email: string }
        | { isSubscribed: boolean }
        | { encr: string; clientUpdated: number }

      let user = req.user!
      if ('username' in body)
        user = await UserService.updateUsername(user, {
          ...body,
          clientId: req.sse.clientId,
        })
      else if ('email' in body)
        user = await UserService.updateEmail(user, body.email)
      else if ('isSubscribed' in body)
        user = await UserService.updateIsSubscribedStatus({
          userId: user.id,
          newStatus: body.isSubscribed,
          clientId: req.sse.clientId,
        })
      else if ('encr' in body)
        user = await UserService.incrementalUserUpdate({
          user,
          data: body,
          clientId: req.sse.clientId,
        })

      res.json(serializeModel(user, Serializers.userFullNoAssociations))
    }),
  )
  .delete(
    isRestAuth(true),
    ash(async (req, res) => {
      await UserService.dropUser({
        password: req.body.password,
        user: req.user!,
      })

      resetCookies(res)

      res.json({})
    }),
  )

userRouter.post<{ unsubscribeToken: string }, {}>(
  '/unsubscribe/:unsubscribeToken',
  ash(async (req, res) => {
    await UserService.useUnsubscribeLink(req.params.unsubscribeToken)
    res.json({})
  }),
)

import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth, resetCookies } from '@/middlewares/isAuth'
import { UserService } from '@/services/user/userService'
import { UserManager } from '@/models/user.model'
import { serializeModel, Serializers } from '@/models/serializers'

export const userRouter = Router()

userRouter
  .route('')
  .get(
    isRestAuth(),
    ash(async (req, res) => {
      const user = (await UserManager.byIdWithDataIncluded(req.userId))!

      res.json(serializeModel(user, Serializers.userFull))
    }),
  )
  .patch(
    isRestAuth(true),
    ash(async (req, res) => {
      const { username, email, isSubscribed } = req.body as {
        username?: string
        email?: string
        isSubscribed?: boolean
      }
      let user = req.user!
      if (username) {
        user = await UserService.updateUsername(user, { username })
      } else if (email) {
        user = await UserService.updateEmail(user, email)
      } else if (typeof isSubscribed !== 'undefined')
        user = await UserService.updateIsSubscribedStatus({
          userId: user.id,
          newStatus: isSubscribed,
        })

      res.json(serializeModel(user, Serializers.userFull))
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

userRouter
  .get<{}, { ticket: string }>(
    '/wsTicket',
    isRestAuth(),
    ash(async (req, res) => {
      const ticket = await UserService.generateNewWsTicket(req.userId)

      res.json({ ticket })
    }),
  )
  .post<{ unsubscribeToken: string }, {}>(
    '/unsubscribe/:unsubscribeToken',
    ash(async (req, res) => {
      await UserService.useUnsubscribeLink(req.params.unsubscribeToken)
      res.json({})
    }),
  )

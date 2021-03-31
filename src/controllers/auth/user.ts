import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth, resetCookies } from '@/middlewares/isAuth'
import { UserService } from '@/services/user/userService'
import { BillingService } from '@/services/billing/billingService'
import User from '@/models/user.model'

export const userRouter = Router()
  .get(
    '',
    isRestAuth(true),
    ash(async (req, res) => {
      res.json({
        user: req.user,
        plan: await BillingService.getPlanByUserId(req.userId),
      })
    }),
  )
  .patch<
    {},
    User,
    {
      username?: string
      email?: string
      isSubscribed?: boolean
    }
  >(
    '',
    isRestAuth(true),
    ash(async (req, res) => {
      const { username, email, isSubscribed } = req.body
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

      res.json(user)
    }),
  )
  .delete<{}, {}, { password: string }>(
    '',
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

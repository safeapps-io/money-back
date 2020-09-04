import { Router } from 'express'
import ash from 'express-async-handler'

import { UserService } from '@/services/user/userService'
import { InviteService } from '@/services/invite/inviteService'

export const waitlistRouter = Router()

waitlistRouter.post(
  '/signup',
  ash(async (req, res) => {
    await UserService.waitlistSignup(
      req.body as {
        email: string
        invite?: string
      },
    )

    res.json({})
  }),
)

waitlistRouter.get<{ encryptedUserId: string }>(
  '/stats/:encryptedUserId',
  ash(async (req, res) => {
    res.json(
      await InviteService.getCurrentWaitlistStats(req.params.encryptedUserId),
    )
  }),
)

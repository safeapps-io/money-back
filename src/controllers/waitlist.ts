import { Router } from 'express'
import ash from 'express-async-handler'

import { UserService } from '@/services/user/userService'
import { InviteService } from '@/services/invite/inviteService'
import { ValidateEmailService } from '@/services/user/validateEmailService'
import { UserManager } from '@/models/user.model'

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

waitlistRouter.post<{ emailToken: string }>(
  '/validateEmail/:emailToken',
  ash(async (req, res) => {
    const { userId } = await ValidateEmailService.validateToken(
        req.params.emailToken,
      ),
      user = await UserManager.byId(userId)

    const alreadyVerified = !!user?.email
    if (!alreadyVerified)
      await ValidateEmailService.updateEmail(req.params.emailToken)

    return res.json({
      encryptedUserId: InviteService.getUserIdEnctypted(userId),
      alreadyVerified,
    })
  }),
)

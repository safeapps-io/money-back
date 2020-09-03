import { Router } from 'express'
import ash from 'express-async-handler'

import { UserService } from '@/services/user/userService'

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

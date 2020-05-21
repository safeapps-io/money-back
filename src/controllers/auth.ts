import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { UserService } from '@/services/user/userService'
import { getDeviceDescription } from '@/services/deviceDescription'
import { ValidateEmailService } from '@/services/user/validateEmailService'
import { PasswordService } from '@/services/password'
import { InviteService } from '@/services/invite'

const authRouter = Router()

authRouter.get('/user', isRestAuth, (req, res) => {
  res.json(req.user)
})

authRouter.post(
  '/isInviteValid',
  ash(async (req, res) => {
    const body = req.body as {
      invite: string
    }
    await InviteService.getUserIdFromInvite(body.invite)
    res.json({})
  }),
)

authRouter.post(
  '/signup',
  ash(async (req, res) => {
    const body = req.body as {
      username: string
      email?: string
      invite?: string
      password: string
    }

    const result = await UserService.signup({
      ...body,
      description: getDeviceDescription(req.get('User-Agent') || ''),
    })

    res.json(result)
  }),
)

authRouter.post(
  '/signin',
  ash(async (req, res) => {
    const body = req.body as {
      usernameOrEmail: string
      password: string
    }

    const result = await UserService.signin({
      ...body,
      description: getDeviceDescription(req.get('User-Agent') || ''),
    })

    res.json(result)
  }),
)

authRouter.post(
  '/changePassword',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as {
      oldPassword: string
      newPassword: string
    }
    await PasswordService.updatePassword({ ...body, user: req.user })

    res.json({})
  }),
)

authRouter.post(
  '/requestPasswordReset',
  ash(async (req, res) => {
    const { email } = req.body as {
      email: string
    }
    await PasswordService.requestPasswordReset(email)

    res.json({})
  }),
)

authRouter.post(
  '/isResetTokenValid',
  ash(async (req, res) => {
    const { token } = req.body as {
      token: string
    }
    await PasswordService.getUserIdFromPasswordResetToken(token)

    res.json({})
  }),
)

authRouter.post(
  '/setPasswordFromResetToken',
  ash(async (req, res) => {
    const body = req.body as {
      token: string
      password: string
    }
    await PasswordService.updatePasswordFromResetToken(body)

    res.json({})
  }),
)

authRouter.post(
  '/updateUser',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as {
      username: string
      email?: string
    }
    const user = await UserService.updateUser(req.user, body)

    res.json(user)
  }),
)

authRouter.post(
  '/updateInviteKey',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as {
      inviteKey: string
    }
    const user = await UserService.updateUser(req.user, body)

    res.json(user)
  }),
)

authRouter.post(
  '/validateEmail',
  ash(async (req, res) => {
    const body = req.body as {
      emailToken: string
    }

    await ValidateEmailService.updateEmail(body.emailToken)
    res.json({})
  }),
)

authRouter.post(
  '/newToken',
  ash(async (req, res) => {
    const body = req.body as {
      accessToken: string
      refreshToken: string
    }

    const token = await UserService.getNewAccessToken(
      body.accessToken,
      body.refreshToken,
    )
    res.json({ token })
  }),
)

export default authRouter

import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { UserService } from '@/services/user/userService'
import { getDeviceDescription } from '@/services/deviceDescription'
import { ValidateEmailService } from '@/services/user/validateEmailService'
import { PasswordService } from '@/services/user/passwordService'
import { InviteService } from '@/services/invite/inviteService'
import { InvitePurpose } from '@/services/invite/inviteTypes'

export const authRouter = Router()

authRouter.get('/user', isRestAuth, (req, res) => {
  res.json(req.user)
})

authRouter.post(
  '/invite/isValid',
  ash(async (req, res) => {
    const { invite, purpose } = req.body as {
        invite: string
        purpose?: InvitePurpose
      },
      parsedInvite = await InviteService.parseAndValidateInvite({
        b64InviteString: invite,
        purpose,
      })

    // @ts-ignore
    if ('userInviter' in parsedInvite) delete parsedInvite.userInviter

    res.json(parsedInvite)
  }),
)

authRouter.get(
  '/invite/usage',
  isRestAuth,
  ash(async (req, res) => {
    res.json({
      usage: await InviteService.getCurrentMonthlyInviteUsage(req.user.id),
    })
  }),
)

authRouter.post(
  '/signup',
  ash(async (req, res) => {
    const body = req.body as {
      username: string
      email?: string
      invite: string
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
  '/updateUsername',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as {
      username: string
    }
    const user = await UserService.updateUsername(req.user, body)

    res.json(user)
  }),
)

authRouter.post(
  '/updateEmail',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as {
      email: string
    }
    const user = await UserService.updateEmail(req.user, body.email)

    res.json(user)
  }),
)

authRouter.post(
  '/updateMasterPassword',
  isRestAuth,
  ash(async (req, res) => {
    const {
      b64salt,
      b64InvitePublicKey,
      b64EncryptedInvitePrivateKey,
      chests,
    } = req.body as {
      b64salt: string
      b64InvitePublicKey: string
      b64EncryptedInvitePrivateKey: string
      chests: { walletId: string; chest: string }[]
    }
    const user = await UserService.updateMasterPassword({
      user: req.user,
      b64InvitePublicKey,
      b64EncryptedInvitePrivateKey,
      b64salt,
      chests,
    })

    res.json(user)
  }),
)

authRouter.post<{ emailToken: string }>(
  '/validateEmail/:emailToken',
  ash(async (req, res) => {
    await ValidateEmailService.updateEmail(req.params.emailToken)
    res.json({})
  }),
)

authRouter.post(
  '/logout',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as { refreshToken: string }

    await UserService.logout({
      user: req.user,
      refreshToken: body.refreshToken,
    })
    res.json({})
  }),
)

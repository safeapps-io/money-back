import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth, resetCookies, sendAuthCookies } from '@/middlewares/isAuth'

import { UserService } from '@/services/user/userService'
import { getDeviceDescription } from '@/services/deviceDescription'
import { ValidateEmailService } from '@/services/user/validateEmailService'
import { PasswordService } from '@/services/user/passwordService'
import { InviteService } from '@/services/invite/inviteService'
import { BillingService } from '@/services/billing/billingService'
import {
  constructSimplePostRouter,
  createLimiter,
  ipKeyGetter,
  KeyGetter,
} from '@/middlewares/rateLimiter'

export const authRouter = Router()

authRouter.get(
  '/user',
  isRestAuth(),
  ash(async (req, res) => {
    res.json({
      user: req.user,
      plan: await BillingService.getPlanByUserId(req.userId),
    })
  }),
)

authRouter.get(
  '/user/sessions',
  isRestAuth(),
  ash(async (req, res) => {
    res.json(await UserService.getAllSessions(req.userId, req.tokens.refresh))
  }),
)

authRouter.delete(
  '/user/sessions',
  isRestAuth(),
  ash(async (req, res) => {
    const { ids } = req.body as { ids: string[] }

    await UserService.dropSessions({ userId: req.userId, toDeleteIds: ids })
    res.json(await UserService.getAllSessions(req.userId, req.tokens.refresh))
  }),
)

authRouter.delete(
  '/user',
  isRestAuth(true),
  ash(async (req, res) => {
    const { password } = req.body as { password: string }
    await UserService.dropUser({ password, user: req.user! })

    resetCookies(res)

    res.json({})
  }),
)

authRouter.post(
  '/user/wsTicket',
  isRestAuth(),
  ash(async (req, res) => {
    const ticket = await UserService.generateNewWsTicket(req.userId)

    res.json({ ticket })
  }),
)

authRouter.use(
  '/invite/isValid',
  constructSimplePostRouter({
    // Block for 1 hour if 25 failed attempts were taken in a 1 hour
    limiter: createLimiter('inviteIsValid', {
      points: 25,
      duration: 60 * 60,
      blockDuration: 60 * 60,
    }),
    handler: async (req, res) => {
      const { invite } = req.body as {
          invite: string
        },
        parsedInvite = await InviteService.parseAndValidateInvite(invite)

      // @ts-ignore
      if ('userInviter' in parsedInvite) delete parsedInvite.userInviter

      res.json(parsedInvite)
    },
  }),
)

authRouter.use(
  '/signup',
  constructSimplePostRouter({
    // Block for 1 hour after 25 signups were performed in 1 hour
    limiter: createLimiter('signup', {
      points: 25,
      duration: 60 * 60,
      blockDuration: 60 * 60,
    }),
    consumeMode: 'always',

    handler: async (req, res) => {
      const body = req.body as {
        username: string
        email?: string
        invite?: string
        isSubscribed: boolean
        password: string
      }
      const {
        accessToken,
        refreshToken,
        user,
        isWalletInvite,
      } = await UserService.signup({
        ...body,
        description: getDeviceDescription(req.get('User-Agent') || ''),
      })

      sendAuthCookies(res, accessToken, refreshToken)

      res.json({ user, isWalletInvite })
    },
  }),
)

// Block by IP: for 1 day after 100 failed attempts in a single day
const signinIpLimiter = createLimiter('signinIp', {
  points: 100,
  duration: 60 * 60 * 24,
  blockDuration: 60 * 60 * 24,
})
// Block by IP and username: for 1 day after 10 failed attempts in a single day
const signinIpUsernameLimiter = createLimiter('signinIpUsername', {
    points: 10,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24,
  }),
  signinIpUsernameKeygetter: KeyGetter = (req) =>
    `${req.ip}-${req.body.usernameOrEmail}`
/**
 * Username block: for 7 days after 100 failed attempts in a single day
 *
 * It's rather safe and won't backfire, because a certain IP would be blocked after
 * 10 tries. If this block works, it means someone specifically tries to hack this very
 * account using different IPs.
 */
const accountBlockLimiter = createLimiter('signinUsernameBlock', {
    points: 100,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24 * 7,
  }),
  // Using combined key with ip and username
  accountBlockKeygetter: KeyGetter = (req) => req.body.usernameOrEmail

authRouter.use(
  '/signin',
  Router().post(
    '',
    ash(async (req, res) => {
      const body = req.body as {
        usernameOrEmail: string
        password: string
      }

      const checksAndKeysMap: [string, ReturnType<typeof createLimiter>][] = [
        [ipKeyGetter(req), signinIpLimiter],
        [signinIpUsernameKeygetter(req), signinIpUsernameLimiter],
        [accountBlockKeygetter(req), accountBlockLimiter],
      ]

      const allChecks = await Promise.all(
        checksAndKeysMap.map(([key, limiter]) => limiter.shouldProceed(key)),
      )
      if (!allChecks.every(Boolean)) return res.status(400).json({})

      try {
        const { accessToken, refreshToken, user } = await UserService.signin({
          ...body,
          description: getDeviceDescription(req.get('User-Agent') || ''),
        })

        sendAuthCookies(res, accessToken, refreshToken)

        res.json({ user })
      } catch (error) {
        await Promise.all(
          checksAndKeysMap.map(([key, limiter]) => limiter.consume(key)),
        )
        throw error
      }
    }),
  ),
)

authRouter.post(
  '/changePassword',
  isRestAuth(true),
  ash(async (req, res) => {
    const body = req.body as {
      oldPassword: string
      newPassword: string
    }
    await PasswordService.updatePassword({ ...body, user: req.user! })

    res.json({})
  }),
)

authRouter.post(
  '/requestPasswordReset',
  constructSimplePostRouter({
    // Block for 5 hour after 50 resets were performed in 1 hour
    limiter: createLimiter('requestPasswordReset', {
      points: 50,
      duration: 60 * 60,
      blockDuration: 60 * 60 * 5,
    }),
    consumeMode: 'always',
    handler: async (req, res) => {
      const { email } = req.body as {
        email: string
      }
      await PasswordService.requestPasswordReset(email)

      res.json({})
    },
  }),
)

authRouter.post(
  '/isResetTokenValid',
  constructSimplePostRouter({
    // Block for 24 hours if 25 failed attempts were taken in a day
    limiter: createLimiter('usePasswordReset', {
      points: 25,
      duration: 60 * 60 * 24,
      blockDuration: 60 * 60 * 24,
    }),
    handler: async (req, res) => {
      const { token } = req.body as {
        token: string
      }
      await PasswordService.getUserIdFromPasswordResetToken(token)

      res.json({})
    },
  }),
)

authRouter.post(
  '/setPasswordFromResetToken',
  constructSimplePostRouter({
    // Block for 24 hours if 25 failed attempts were taken in a day
    limiter: createLimiter('usePasswordReset', {
      points: 25,
      duration: 60 * 60 * 24,
      blockDuration: 60 * 60 * 24,
    }),
    handler: async (req, res) => {
      const body = req.body as {
        token: string
        password: string
      }
      await PasswordService.updatePasswordFromResetToken(body)

      res.json({})
    },
  }),
)

authRouter.post(
  '/updateUsername',
  isRestAuth(true),
  ash(async (req, res) => {
    const body = req.body as {
      username: string
    }
    const user = await UserService.updateUsername(req.user!, body)

    res.json(user)
  }),
)

authRouter.post(
  '/updateEmail',
  isRestAuth(true),
  ash(async (req, res) => {
    const body = req.body as {
      email: string
    }
    const user = await UserService.updateEmail(req.user!, body.email)

    res.json(user)
  }),
)

authRouter.post(
  '/updateIsSubscribed',
  isRestAuth(),
  ash(async (req, res) => {
    const body = req.body as {
      isSubscribed: boolean
    }
    const user = await UserService.updateIsSubscribedStatus({
      userId: req.userId,
      newStatus: body.isSubscribed,
    })

    res.json(user)
  }),
)

authRouter.post(
  '/updateMasterPassword',
  isRestAuth(),
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
      userId: req.userId,
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

authRouter.post<{ unsubscribeToken: string }>(
  '/unsubscribe/:unsubscribeToken',
  ash(async (req, res) => {
    await UserService.useUnsubscribeLink(req.params.unsubscribeToken)
    res.json({})
  }),
)

authRouter.post(
  '/logout',
  isRestAuth,
  ash(async (req, res) => {
    await UserService.logout({
      userId: req.userId,
      refreshToken: req.tokens.refresh,
    })
    resetCookies(res)

    res.json({})
  }),
)

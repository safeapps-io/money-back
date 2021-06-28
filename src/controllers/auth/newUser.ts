import { Router } from 'express'
import ash from 'express-async-handler'

import { sendAuthCookies } from '@/middlewares/isAuth'

import { UserService } from '@/services/user/userService'
import { getDeviceDescription } from '@/services/deviceDescription'
import { ValidateEmailService } from '@/services/user/validateEmailService'
import {
  autoInvokeRateLimiter,
  createLimiter,
  ipKeyGetter,
  KeyGetter,
} from '@/middlewares/rateLimiter'
import { serializeModel, Serializers } from '@/models/serializers'
import { sourceMiddleware } from '@/middlewares/sourceMiddleware'

export const newUserRouter = Router()
  .post(
    '/signup',
    sourceMiddleware,
    autoInvokeRateLimiter({
      // Block for 1 hour after 25 signups were performed in 1 hour
      limiter: createLimiter('signup', {
        points: 25,
        duration: 60 * 60,
        blockDuration: 60 * 60,
      }),
      consumeMode: 'always',

      handler: async (req, res) => {
        const { accessToken, refreshToken, user, isWalletInvite } = await UserService.signup({
          ...(req.body as {
            username: string
            email?: string
            invite?: string
            isSubscribed: boolean
            password: string
          }),
          description: getDeviceDescription(req.get('User-Agent') || ''),
          source: req.userSource,
        })

        sendAuthCookies(res, accessToken, refreshToken)

        res.json({
          user: serializeModel(user, Serializers.userFullNoAssociations),
          isWalletInvite,
        })
      },
    }),
  )
  .post<{ emailToken: string }, {}>(
    '/validate-email/:emailToken',
    ash(async (req, res) => {
      await ValidateEmailService.updateEmail(req.params.emailToken)
      res.json({})
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
  signinIpUsernameKeygetter: KeyGetter = (req) => `${req.ip}-${req.body.usernameOrEmail}`
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

newUserRouter.use(
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

        res.json(serializeModel(user, Serializers.userFullNoAssociations))
      } catch (error) {
        await Promise.all(checksAndKeysMap.map(([key, limiter]) => limiter.consume(key)))
        throw error
      }
    }),
  ),
)

import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { PasswordService } from '@/services/user/passwordService'
import { autoInvokeRateLimiter, createLimiter } from '@/middlewares/rateLimiter'
import { UserService } from '@/services/user/userService'
import User from '@/models/user.model'
import { serializeModel, Serializers } from '@/models/serializers'

export const authorizedPasswordRouter = Router()
  .post<{}, {}, { oldPassword: string; newPassword: string }>(
    '',
    isRestAuth(true),
    ash(async (req, res) => {
      await PasswordService.updatePassword({ ...req.body, user: req.user! })

      res.json({})
    }),
  )
  .post<
    {},
    User,
    {
      b64salt: string
      encr: string | null
      b64InvitePublicKey: string
      b64EncryptedInvitePrivateKey: string
      chests: { walletId: string; chest: string }[]
    }
  >(
    '/master',
    isRestAuth(),
    ash(async (req, res) => {
      const user = await UserService.updateMasterPassword({
        ...req.body,
        userId: req.userId,
        clientId: req.sse.clientId,
      })

      res.json(serializeModel(user, Serializers.userFull))
    }),
  )

export const resetPasswordRouter = Router()
  .get('/:token', async (req, res) => {
    await PasswordService.getUserIdFromPasswordResetToken(req.params.token as string)

    res.json({})
  })
  .post(
    '/request',
    autoInvokeRateLimiter({
      // Block for 5 hour after 50 resets were performed in 1 hour
      limiter: createLimiter('requestPasswordReset', {
        points: 50,
        duration: 60 * 60,
        blockDuration: 60 * 60 * 5,
      }),
      consumeMode: 'always',
      handler: async (req, res) => {
        await PasswordService.requestPasswordReset(req.body.email as string)

        res.json({})
      },
    }),
  )
  .post(
    '/:token',
    autoInvokeRateLimiter({
      // Block for 24 hours if 25 failed attempts were taken in a day
      limiter: createLimiter('usePasswordReset', {
        points: 25,
        duration: 60 * 60 * 24,
        blockDuration: 60 * 60 * 24,
      }),
      handler: async (req, res) => {
        await PasswordService.updatePasswordFromResetToken({
          token: req.params.token as string,
          password: req.body.password as string,
        })

        res.json({})
      },
    }),
  )

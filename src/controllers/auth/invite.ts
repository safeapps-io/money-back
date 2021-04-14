import { Router } from 'express'
import ash from 'express-async-handler'

import {
  constructSimplePostRouter,
  createLimiter,
} from '@/middlewares/rateLimiter'
import { InviteService } from '@/services/invite/inviteService'
import { isRestAuth } from '@/middlewares/isAuth'
import { sse } from '@/middlewares/sse'
import { inviteEventSender } from '@/services/invite/inviteEvents'

export const inviteRouter = Router()

inviteRouter.use(
  '/is-valid/:invite',
  constructSimplePostRouter({
    // Block for 1 hour if 25 failed attempts were taken in a 1 hour
    limiter: createLimiter('inviteIsValid', {
      points: 25,
      duration: 60 * 60,
      blockDuration: 60 * 60,
    }),
    handler: async (req, res) => {
      const parsedInvite = await InviteService.parseAndValidateInvite(
        req.params.invite as string,
      )

      // @ts-ignore
      if ('userInviter' in parsedInvite) delete parsedInvite.userInviter

      res.json(parsedInvite)
    },
  }),
)

inviteRouter
  .use('/join', isRestAuth(true))
  .get('/updates', sse(inviteEventSender))
  .post<
    {},
    {},
    {
      b64InviteString: string
      b64InviteSignatureByJoiningUser: string
      b64PublicECDHKey: string
    }
  >(
    '/validate/request',
    ash(async (req, res) => {
      await InviteService.launchWalletJoin({
        ...req.body,
        joiningUser: req.user!,
      })
      res.json({})
    }),
  )
  .post<
    {},
    {},
    {
      joiningUserId: string
      b64InviteSignatureByJoiningUser: string
      b64InviteString: string
    } & (
      | { isValid: false }
      | {
          allowJoin: false
          b64PublicECDHKey: undefined
          encryptedSecretKey: undefined
        }
      | {
          allowJoin: true
          b64PublicECDHKey: string
          encryptedSecretKey: string
        }
    )
  >(
    '/validate/result',
    ash(async (req, res) => {
      if ('isValid' in req.body) {
        await InviteService.invitationError({
          ...req.body,
          walletOwnerId: req.userId,
        })
      } else {
        await InviteService.invitationResolution({
          walletOwnerId: req.userId,
          ...req.body,
        })
      }
      res.json({})
    }),
  )
  .post<{}, {}, { b64InviteString: string }>(
    '/fail',
    ash(async (req, res) => {
      await InviteService.joiningError({
        ...req.body,
        joiningUser: req.user!,
      })
      res.json({})
    }),
  )

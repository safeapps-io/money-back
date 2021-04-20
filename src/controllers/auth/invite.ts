import { Router } from 'express'
import ash from 'express-async-handler'

import { InviteService } from '@/services/invite/inviteService'
import { isRestAuth } from '@/middlewares/isAuth'

export const inviteRouter = Router().use(isRestAuth(true))

inviteRouter
  .post(
    '/is-valid',
    ash(async (req, res) => {
      const parsedInvite = await InviteService.parseAndValidateInvite(
        req.body.invite as string,
      )

      // @ts-ignore
      if ('userInviter' in parsedInvite) delete parsedInvite.userInviter

      res.json(parsedInvite)
    }),
  )
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
        clientId: req.sse.clientId,
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
          clientId: req.sse.clientId,
        })
      } else {
        await InviteService.invitationResolution({
          ...req.body,
          walletOwnerId: req.userId,
          clientId: req.sse.clientId,
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
        clientId: req.sse.clientId,
      })
      res.json({})
    }),
  )

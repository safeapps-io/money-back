import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'

import { WalletService } from '@/services/wallet/walletService'
import Wallet from '@/models/wallet.model'
import { serializeModel, Serializers } from '@/models/serializers'

export const walletRouter = Router().use(isRestAuth())

walletRouter
  .post<{}, Wallet, { chest: string }>(
    '',
    ash(async (req, res) => {
      const wallet = await WalletService.create(req.userId, req.body.chest)

      res.json(serializeModel(wallet, Serializers.wallet))
    }),
  )
  .put<{ walletId: string }, Wallet, { chest: string }>(
    '/:walletId',
    ash(async (req, res) => {
      const wallet = await WalletService.updateSingleChest({
        clientId: req.sse.clientId,
        walletId: req.params.walletId,
        userId: req.userId,
        chest: req.body.chest,
      })

      res.json(serializeModel(wallet, Serializers.wallet))
    }),
  )
  .delete<{ walletId: string }>(
    '/:walletId',
    ash(async (req, res) => {
      await WalletService.destroy(req.userId, req.params.walletId, req.sse.clientId)

      res.json({})
    }),
  )
  .delete<
    {
      walletId: string
      userId: string
    },
    Wallet
  >(
    '/:walletId/user/:userId',
    ash(async (req, res) => {
      const { walletId, userId: userToRemoveId } = req.params

      const wallet = await WalletService.removeUser({
        clientId: req.sse.clientId,
        initiatorId: req.userId,
        walletId,
        userToRemoveId,
      })

      res.json(serializeModel(wallet!, Serializers.wallet))
    }),
  )

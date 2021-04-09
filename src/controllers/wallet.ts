import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { isPlanActive } from '@/middlewares/isPlanActive'
import { WalletService } from '@/services/wallet/walletService'
import Wallet from '@/models/wallet.model'
import { serializeModel, Serializers } from '@/models/serializers'

export const walletRouter = Router()
  .use(isRestAuth())
  .post<{}, Wallet, { chest: string }>(
    '',
    isPlanActive(),
    ash(async (req, res) => {
      const wallet = await WalletService.create(req.userId, req.body.chest)

      res.json(serializeModel(wallet, Serializers.wallet))
    }),
  )
  .put<{ walletId: string }, Wallet, { chest: string }>(
    '/:walletId',
    ash(async (req, res) => {
      const wallet = await WalletService.updateSingleChest({
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
      await WalletService.destroy(req.userId, req.params.walletId)

      res.json({})
    }),
  )
  .delete<
    {},
    Wallet,
    {
      walletId: string
      userId: string
    }
  >(
    '/user',
    ash(async (req, res) => {
      const { walletId, userId: userToRemoveId } = req.body

      const wallet = await WalletService.removeUser({
        initiatorId: req.userId,
        walletId,
        userToRemoveId,
      })

      res.json(serializeModel(wallet!, Serializers.wallet))
    }),
  )

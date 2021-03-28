import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { isPlanActive } from '@/middlewares/isPlanActive'
import { WalletService } from '@/services/wallet/walletService'
import Wallet from '@/models/wallet.model'

export const walletRouter = Router()
  .use(isRestAuth())
  .post<{}, Wallet, { chest: string }>(
    '',
    isPlanActive(),
    ash(async (req, res) => {
      const wallet = await WalletService.create(req.userId, req.body.chest)

      res.json(wallet)
    }),
  )
  .delete<{}, {}, { walletId: string }>(
    '',
    ash(async (req, res) => {
      await WalletService.destroy(req.userId, req.body.walletId)

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

      res.json(wallet!)
    }),
  )
  .put<{}, Wallet, { walletId: string; chest: string }>(
    '/chest',
    ash(async (req, res) => {
      const wallet = await WalletService.updateSingleChest({
        ...req.body,
        userId: req.userId,
      })

      res.json(wallet)
    }),
  )

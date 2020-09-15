import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { WalletService } from '@/services/wallet/walletService'

export const walletRouter = Router()

walletRouter.post(
  '/create',
  isRestAuth,
  ash(async (req, res) => {
    const { chest } = req.body as { chest: string }

    const wallet = await WalletService.create(req.user.id, chest)

    res.json(wallet)
  }),
)

walletRouter.post(
  '/delete',
  isRestAuth,
  ash(async (req, res) => {
    const { walletId } = req.body as { walletId: string }

    await WalletService.destroy(req.user.id, walletId)

    res.json({})
  }),
)

walletRouter.post(
  '/user/delete',
  isRestAuth,
  ash(async (req, res) => {
    const { walletId, userId: userToRemoveId } = req.body as {
      walletId: string
      userId: string
    }

    const wallet = await WalletService.removeUser({
      initiatorId: req.user.id,
      walletId,
      userToRemoveId,
    })

    res.json(wallet)
  }),
)

walletRouter.post(
  '/updateChest',
  isRestAuth,
  ash(async (req, res) => {
    const wallet = await WalletService.updateSingleChest({
      ...(req.body as { walletId: string; chest: string }),
      userId: req.user.id,
    })

    res.json(wallet)
  }),
)

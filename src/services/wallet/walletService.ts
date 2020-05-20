import * as yup from 'yup'

import { AccessError } from '@/core/errors'
import Wallet, { WalletManager } from '@/models/wallet.model'
import { runSchemaWithFormError } from '@/utils/yupHelpers'

export class WalletService {
  static async getWalletByUserAndId({
    userId,
    walletId,
  }: {
    userId: string
    walletId: string
  }) {
    const res = await WalletManager.byIdAndUserId({ userId, walletId })
    if (!res) throw new AccessError()
    return res
  }

  static async getUserWallets(userId: string) {
    return WalletManager.byUserId(userId)
  }

  static async getUserWalletIds(userId: string) {
    return (await WalletManager.byUserId(userId)).map(ent => ent.id)
  }

  static async getWalletUserIds(walletId: string) {
    return (await WalletManager.byId(walletId))?.users.map(user => user.id)
  }
}

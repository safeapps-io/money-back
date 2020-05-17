import { WalletAccessManager } from '@/models/walletAccess.model'
import { AccessError } from '@/core/errors'

export class WalletService {
  static async checkIfUserHasAccess({
    userId,
    walletId,
  }: {
    userId: string
    walletId: string
  }) {
    const res = await WalletAccessManager.findOne({ userId, walletId })
    if (!res) throw new AccessError()
  }

  static async getUserWalletIds(userId: string) {
    return (await WalletAccessManager.findAllByUserId(userId)).map(
      ent => ent.walletId,
    )
  }
}

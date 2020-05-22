import { Table, BelongsToMany, HasMany } from 'sequelize-typescript'
import { Op } from 'sequelize'

import BaseModel from '@/models/base'
import User from '@/models/user.model'
import WalletAccess, { AccessLevels } from '@/models/walletAccess.model'
import Entity from '@/models/entity.model'

@Table
export default class Wallet extends BaseModel<Wallet> {
  @BelongsToMany(
    () => User,
    () => WalletAccess,
  )
  users!: Array<User & { WalletAccess: WalletAccess }>

  @HasMany(() => Entity)
  entities!: Entity[]
}

export class WalletManager {
  private static filterByUser = (userId: string) => ({
    include: [
      {
        model: User,
        through: {
          where: { accessLevel: { [Op.not]: AccessLevels.rejected }, userId },
        },
      },
    ],
  })

  static byIdAndUserId({
    userId,
    walletId,
  }: {
    userId: string
    walletId: string
  }) {
    return Wallet.findOne({
      ...this.filterByUser(userId),
      where: { id: walletId },
    })
  }

  static byUserId(userId: string) {
    return Wallet.findAll({ ...this.filterByUser(userId) })
  }

  static byId(id: string) {
    return Wallet.findOne({
      where: { id },
      include: [{ model: User }],
    })
  }

  static async update(id: string, wallet: Partial<Wallet>) {
    return (
      await Wallet.update(wallet, {
        where: { id },
        returning: true,
      })
    )[1][0]
  }

  static getUpdates({
    id,
    latestUpdated,
  }: {
    id: string
    latestUpdated: Date
  }) {
    return Wallet.findOne({
      where: { id, updated: { [Op.gt]: latestUpdated } },
    })
  }

  static create() {
    return Wallet.create()
  }

  static destroy(walletId: string) {
    return Wallet.destroy({ where: { id: walletId } })
  }
}

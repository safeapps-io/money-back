import { Table, BelongsToMany, HasMany } from 'sequelize-typescript'
import { Op } from 'sequelize'

import { getTransaction } from '@/models/setup'

import BaseModel from '@/models/base'
import User from '@/models/user.model'
import WalletAccess, { AccessLevels } from '@/models/walletAccess.model'
import Entity from '@/models/entity.model'

@Table
export default class Wallet extends BaseModel<Wallet> {
  @BelongsToMany(() => User, () => WalletAccess)
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
      include: [User],
    })
  }

  static byIds(ids: string[]) {
    return Wallet.findAll({ where: { id: { [Op.in]: ids } }, include: [User] })
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

  static create({
    userId,
    chest,
  }: {
    userId: string
    chest: string
  }): Promise<Wallet> {
    return getTransaction(async () => {
      const wallet = await Wallet.create()

      await WalletAccess.create({
        userId,
        walletId: wallet.id,
        chest,
        accessLevel: AccessLevels.owner,
      })

      return this.byId(wallet.id)
    })
  }

  static destroy(walletId: string) {
    return Wallet.destroy({ where: { id: walletId } })
  }

  static createOwner({
    chest,
    userId,
    walletId,
  }: {
    chest: string
    userId: string
    walletId: string
  }) {
    return WalletAccess.create({
      userId,
      walletId,
      chest,
      accessLevel: AccessLevels.owner,
    })
  }

  static removeUser({
    walletId,
    userId,
  }: {
    walletId: string
    userId: string
  }) {
    return WalletAccess.update(
      { chest: null, userId: null, accessLevel: AccessLevels.deleted },
      { where: { walletId, userId }, returning: true },
    )
  }

  static removeUserByWaId(waId: string) {
    return WalletAccess.destroy({ where: { id: waId } })
  }

  static removeWithJoiningError(data: {
    userId: string
    walletId: string
    inviteId: string
  }) {
    return WalletAccess.destroy({ where: { ...data, chest: null } })
  }

  static addRejectedInvite(data: { walletId: string; inviteId: string }) {
    return WalletAccess.create({
      ...data,
      accessLevel: AccessLevels.rejected,
    })
  }

  static addUser(data: { walletId: string; userId: string; inviteId: string }) {
    return WalletAccess.create({
      ...data,
      accessLevel: AccessLevels.usual,
    })
  }

  static updateChests(
    data: {
      id: string
      chest: string
    }[],
  ) {
    // Bulk create works as bulk update by key
    return WalletAccess.bulkCreate(data, { returning: true })
  }
}

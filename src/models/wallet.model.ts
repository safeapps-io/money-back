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

  public toJSON() {
    const curr = super.toJSON() as any,
      users = this.users.map((user) => ({
        ...user.toJSON(false),
        WalletAccess: user.WalletAccess.toJSON(),
      }))

    curr.users = users
    return curr
  }
}

export class WalletManager {
  private static filterByUser = (userId: string) => ({
    attributes: ['id'],
    include: [
      {
        model: User,
        required: true,
        through: {
          where: { accessLevel: { [Op.not]: AccessLevels.rejected }, userId },
        },
      },
    ],
  })

  static async byIdAndUserId({
    userId,
    walletId,
  }: {
    userId: string
    walletId: string
  }) {
    const res = await this.byUserId(userId)
    return res.find((wallet) => wallet.id === walletId)
  }

  static async byUserId(userId: string) {
    /**
     * TODO: make it one query
     * Looks pretty ugly to me. It requires two queries, because I don't quite get joins.
     */
    const ids = (await Wallet.findAll(this.filterByUser(userId))).map(
      (ent) => ent.id,
    )

    return Wallet.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        { model: User, through: { where: { userId: { [Op.not]: null } } } },
      ],
    })
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

import { Table, BelongsToMany } from 'sequelize-typescript'
import { Op } from 'sequelize'

import { getTransaction } from '@/models/setup'

import BaseModel from '@/models/base'
import User from '@/models/user.model'
import WalletAccess, { AccessLevels } from '@/models/walletAccess.model'
import Plan from '@/models/billing/plan.model'
import Product from './billing/product.model'

@Table
export default class Wallet extends BaseModel<Wallet> {
  @BelongsToMany(() => User, () => WalletAccess)
  users!: Array<User & { WalletAccess: WalletAccess }>

  public toJSON() {
    const curr = super.toJSON() as any,
      users = this.users?.map((user) => ({
        ...user.toJSON(false),
        WalletAccess: user.WalletAccess.toJSON(),
      }))

    curr.users = users || []
    return curr
  }
}

export class WalletManager {
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
    const userWalletIds = await Wallet.findAll({
      attributes: ['id'],
      include: [
        {
          model: User,
          required: true,
          through: {
            where: { accessLevel: { [Op.not]: AccessLevels.rejected }, userId },
          },
          attributes: [],
        },
      ],
    })

    return Wallet.findAll({
      where: { id: { [Op.in]: userWalletIds.map((record) => record.id) } },
      include: [
        {
          model: User,
          include: [{ model: Plan, include: [{ model: Product }] }],
        },
      ],
    })
  }

  static byId(id: string) {
    return Wallet.findOne({
      where: { id },
      include: [{ model: User, include: [{ model: Plan }] }],
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

  static isWalletInviteDisposed(data: { walletId: string; inviteId: string }) {
    return WalletAccess.count({ where: data })
  }

  static addUser(data: { walletId: string; userId: string; inviteId: string }) {
    return WalletAccess.create({
      ...data,
      accessLevel: AccessLevels.usual,
    })
  }

  static bulkUpdate(data: WalletAccess[]) {
    /**
     * TODO: Need to use upsert here.
     * For some very unobvious reason `bulkCreate` fails. Now it generates SQL with empty
     * `ON CONFLICT()` braces, which is a syntax error.
     *
     * I found that this is a known behaviour for composite key situation, they even have
     * a fix for Sequelize v6, but no for v5: https://github.com/sequelize/sequelize/pull/11984
     * I'm stuck with Sequelize v5 for now, because I rely on sequelize-typescript lib:
     * https://github.com/RobinBuschmann/sequelize-typescript/issues/804
     *
     * This behaviour is strange, because I in fact do not have any composite keys here. I've
     * created a small repo alongside this one in Projects/temp/sequelize-update-issue,
     * that shows that upsert should work ok in my case. But it doesn't.
     * Which makes me think, that sequelize-typescript somehow instructs Sequelize the wrong way,
     * making it think I have some composite keys, which I do not.
     * Maybe it wouldn't hurt a lot if I dropped sequelize-typescript at all, since it doesn't
     * really make a lot of difference in this project.
     */
    return Promise.all(data.map((wa) => wa.save()))
  }
}

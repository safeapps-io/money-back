import {
  Table,
  Column,
  Unique,
  DataType,
  AllowNull,
  HasMany,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
} from 'sequelize-typescript'
import sequelize, { Op } from 'sequelize'

import { getValue, setValue } from '@/utils/blobAsBase64'

import BaseModel from '@/models/base'
import RefreshToken from '@/models/refreshToken.model'
import Wallet from '@/models/wallet.model'
import WalletAccess from '@/models/walletAccess.model'
import Plan from './billing/plan.model'
import Product from './billing/product.model'
import ChargeEvent from './billing/chargeEvent.model'
import { endOfDay, startOfDay } from 'date-fns'

@Table
export default class User extends BaseModel {
  @Unique
  @Column
  username!: string

  @AllowNull
  @Unique
  @Column(DataType.STRING)
  email!: string | null

  @Column
  password!: string

  @AllowNull
  @Column(DataType.BOOLEAN)
  isAdmin!: boolean | null

  @AllowNull
  @Column(DataType.BOOLEAN)
  isSubscribed!: boolean | null

  @AllowNull
  @Column(DataType.JSON)
  meta!: {
    source?: { [param: string]: string } | null
    tags?: string[] | null
  } | null

  @AllowNull
  @Column({
    type: DataType.BLOB,
    get(this: User) {
      return getValue(this.getDataValue('b64InvitePublicKey'))
    },
    set(this: User, val: string | Buffer) {
      setValue(val, (newVal) => this.setDataValue('b64InvitePublicKey', newVal))
    },
  })
  b64InvitePublicKey!: string | Buffer | null

  @AllowNull
  @Column({
    type: DataType.BLOB,
    get(this: User) {
      return getValue(this.getDataValue('b64EncryptedInvitePrivateKey'))
    },
    set(this: User, val: string) {
      setValue(val, (newVal) =>
        this.setDataValue('b64EncryptedInvitePrivateKey', newVal as string | null),
      )
    },
  })
  b64EncryptedInvitePrivateKey!: string | null

  @AllowNull
  @Column({
    type: DataType.BLOB,
    get(this: User) {
      return getValue(this.getDataValue('b64salt'))
    },
    set(this: User, val: string | Buffer) {
      setValue(val, (newVal) => this.setDataValue('b64salt', newVal))
    },
  })
  b64salt!: string | Buffer | null

  @AllowNull
  @Column({
    type: DataType.BLOB,
    get(this: User) {
      return getValue(this.getDataValue('encr'))
    },
    set(this: User, val: string | Buffer) {
      setValue(val, (newVal) => this.setDataValue('encr', newVal))
    },
  })
  encr!: Buffer | string | null

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isWaitlist!: boolean

  @AllowNull
  @Column(DataType.STRING)
  inviteId!: string | null

  @AllowNull
  @Column(DataType.INTEGER)
  inviteMonthlyLimit!: number | null

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.STRING)
  inviterId!: string | null

  @BelongsTo(() => User)
  inviter!: User

  @HasMany(() => User, 'inviterId')
  invitedUsers!: User[]

  @HasMany(() => RefreshToken)
  refreshTokens!: RefreshToken[]

  @HasMany(() => Plan)
  plans!: Plan[]

  @BelongsToMany(() => Wallet, () => WalletAccess)
  wallets!: Array<Wallet & { WalletAccess: WalletAccess }>

  public toJSON(includePrivateData = true) {
    const curr = super.toJSON() as any
    delete curr.password

    if (!includePrivateData) {
      delete curr.inviteMonthlyLimit
      delete curr.inviterId
      delete curr.email
      delete curr.b64InvitePublicKey
      delete curr.b64EncryptedInvitePrivateKey
      delete curr.b64salt
      delete curr.encr
    }

    // Making this field private
    if (!curr.isAdmin) delete curr.isAdmin

    return curr
  }
}

export class UserManager {
  static create(data: {
    email?: string
    username: string
    password: string
    isSubscribed: boolean
    meta: User['meta']
    inviterId?: string
    inviteId?: string
    isWaitlist?: boolean
  }) {
    return User.create(data)
  }

  static byId(userId: string) {
    return User.findByPk(userId, {
      include: [{ model: Plan }],
    })
  }

  static byIdWithDataIncluded(userId: string) {
    return User.findByPk(userId, {
      include: [{ model: Plan, include: [{ model: Product }, { model: ChargeEvent }] }],
    })
  }

  static async isUsernameTaken(username: string, excludeId?: string) {
    const count = await User.count({
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn('lower', sequelize.col('username')),
            sequelize.fn('lower', username),
          ),
          { id: { [Op.not]: excludeId || '' } },
        ],
      },
    })
    return count !== 0
  }

  static async isEmailTaken(email: string, excludeId?: string) {
    const count = await User.count({
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn('lower', sequelize.col('email')),
            sequelize.fn('lower', email),
          ),
          { id: { [Op.not]: excludeId || '' } },
        ],
      },
    })
    return count !== 0
  }

  static findByEmailOrUsername(usernameOrEmail: string) {
    return User.findOne({
      where: {
        [Op.and]: {
          isWaitlist: false,
          [Op.or]: [
            sequelize.where(
              sequelize.fn('lower', sequelize.col('email')),
              sequelize.fn('lower', usernameOrEmail),
            ),
            sequelize.where(
              sequelize.fn('lower', sequelize.col('username')),
              sequelize.fn('lower', usernameOrEmail),
            ),
          ],
        },
      },
    })
  }

  static changePassword(userId: string, password: string) {
    return this.update(userId, { password })
  }

  static async update(id: string, user: Partial<User>) {
    return (
      await User.update(user, {
        where: { id },
        returning: true,
      })
    )[1][0]
  }

  static getUpdates({ id, latestUpdated }: { id: string; latestUpdated: Date }) {
    return User.findOne({
      where: { id, updated: { [Op.gt]: latestUpdated } },
    })
  }

  static isInviteDisposed(inviteId: string) {
    return User.count({ where: { inviteId } })
  }

  static deleteUserById(userId: string) {
    return User.destroy({ where: { id: userId } })
  }

  static createdBetweenDates(start: Date, end: Date) {
    return User.findAll({
      where: { created: { [Op.gt]: start, [Op.lt]: end } },
    })
  }

  static count() {
    return User.count()
  }

  static searchByQuery({
    query = null,
    date = null,
  }: {
    query?: string | null
    date?: Date | null
  }) {
    const where: any = {}
    let limit: number | undefined = 50
    if (query) {
      where[Op.or] = [
        { id: query },
        sequelize.where(
          sequelize.fn('lower', sequelize.col('username')),
          sequelize.fn('lower', query),
        ),
        sequelize.where(
          sequelize.fn('lower', sequelize.col('email')),
          sequelize.fn('lower', query),
        ),
      ]
      limit = undefined
    }
    if (date) {
      where.created = {
        [Op.between]: [startOfDay(date), endOfDay(date)],
      }
      limit = undefined
    }

    return User.findAll({ where, order: [['created', 'DESC']], limit })
  }

  static byIdWithAdminDataIncluded(userId: string) {
    return User.findByPk(userId, {
      include: { all: true, nested: true },
    })
  }
}

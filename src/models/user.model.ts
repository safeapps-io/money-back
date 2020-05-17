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
import { Op } from 'sequelize'

import BaseModel from '@/models/base'
import RefreshToken from '@/models/refreshToken.model'
import Wallet from '@/models/wallet.model'
import WalletAccess from '@/models/walletAccess.model'

@Table
export default class User extends BaseModel<User> {
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
  @Column(DataType.STRING(2048))
  inviteKey!: string | null

  @AllowNull
  @Column(DataType.TEXT)
  encr!: string | null

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

  @BelongsToMany(
    () => Wallet,
    () => WalletAccess,
  )
  wallets!: Array<Wallet & { WalletAccess: WalletAccess }>

  public toJSON() {
    const prev = super.toJSON()
    const curr = { ...prev, password: '' }
    delete curr.password

    return curr
  }
}

export class UserManager {
  static createUser(data: {
    email?: string
    username: string
    password: string
    inviterId?: string
  }) {
    return User.create(data)
  }

  static getUserById(userId: string) {
    return User.findByPk(userId)
  }

  static async isUsernameTaken(username: string, excludeId?: string) {
    const q = { username } as { [key: string]: any }
    if (excludeId) q['id'] = { [Op.not]: excludeId }
    const count = await User.count({ where: q })
    return count !== 0
  }

  static async isEmailTaken(email: string, excludeId?: string) {
    const q = { email } as { [key: string]: any }
    if (excludeId) q['id'] = { [Op.not]: excludeId }
    const count = await User.count({ where: q })
    return count !== 0
  }

  static findUser(usernameOrEmail: string) {
    return User.findOne({
      where: { [Op.or]: { username: usernameOrEmail, email: usernameOrEmail } },
    })
  }

  static changeUserPassword(userId: string, password: string) {
    return User.update({ password }, { where: { id: userId } })
  }

  static async updateUser(
    userId: string,
    data: {
      username?: string
      email?: string
      encr?: string | null
      inviteKey?: string | null
    },
  ) {
    const resultData = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value !== 'undefined') acc[key] = value
      return acc
    }, {} as { [key: string]: any })

    return (
      await User.update(resultData, { where: { id: userId }, returning: true })
    )[1][0]
  }
}

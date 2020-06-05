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
import { encode, decode } from 'base64-arraybuffer'

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
  b64InvitePublicKey!: string | null

  @AllowNull
  @Column(DataType.STRING(2048))
  b64EncryptedInvitePrivateKey!: string | null

  @AllowNull
  @Column({
    type: DataType.BLOB,
    get(this: User) {
      const encr = this.getDataValue('encr')
      if (typeof encr === 'string') return encr
      else return encode(encr)
    },
    set(this: User, val: string | Buffer) {
      if (typeof val === 'string')
        this.setDataValue('encr', Buffer.from(decode(val)))
      else this.setDataValue('encr', val)
    },
  })
  encr!: Buffer | string

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
  static create(data: {
    email?: string
    username: string
    password: string
    inviterId?: string
  }) {
    return User.create(data)
  }

  static byId(userId: string) {
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

  static findByEmailOrUsername(usernameOrEmail: string) {
    return User.findOne({
      where: { [Op.or]: { username: usernameOrEmail, email: usernameOrEmail } },
    })
  }

  static changeUserPassword(userId: string, password: string) {
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

  static getUpdates({
    id,
    latestUpdated,
  }: {
    id: string
    latestUpdated: Date
  }) {
    return User.findOne({
      where: { id, updated: { [Op.gt]: latestUpdated } },
    })
  }
}

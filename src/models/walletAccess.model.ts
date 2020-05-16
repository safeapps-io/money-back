import {
  Table,
  Column,
  ForeignKey,
  DataType,
  AllowNull,
} from 'sequelize-typescript'

import BaseModel from './base'
import User from './user.model'
import Wallet from './wallet.model'

export enum AccessLevels {
  owner = 'owner',
  usual = 'usual',
  rejected = 'rejected',
}

@Table
export default class WalletAccess extends BaseModel<WalletAccess> {
  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.STRING)
  userId!: string | null

  @ForeignKey(() => Wallet)
  @Column
  walletId!: string

  @AllowNull
  @Column(DataType.STRING(2048))
  chest!: string | null

  @Column(DataType.STRING(32))
  inviteId!: string

  @Column(DataType.STRING(16))
  accessLevel!: AccessLevels
}

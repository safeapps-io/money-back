import {
  Table,
  Column,
  ForeignKey,
  DataType,
  AllowNull,
} from 'sequelize-typescript'

import BaseModel from '@/models/base'
import User from '@/models/user.model'
import Wallet from '@/models/wallet.model'

export enum AccessLevels {
  owner = 'owner',
  usual = 'usual',
  rejected = 'rejected',
  deleted = 'deleted',
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

  @AllowNull
  @Column(DataType.STRING(32))
  inviteId!: string | null

  @Column(DataType.STRING(16))
  accessLevel!: AccessLevels
}

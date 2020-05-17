import {
  Table,
  Column,
  ForeignKey,
  DataType,
  AllowNull,
} from 'sequelize-typescript'
import { Op } from 'sequelize'

import BaseModel from '@/models/base'
import User from '@/models/user.model'
import Wallet from '@/models/wallet.model'

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

export class WalletAccessManager {
  static findOne(filter: { userId: string; walletId: string }) {
    return WalletAccess.findOne({
      where: { ...filter, accessLevel: { [Op.not]: AccessLevels.rejected } },
    })
  }
}

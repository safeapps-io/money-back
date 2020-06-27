import {
  Table,
  Column,
  ForeignKey,
  DataType,
  AllowNull,
} from 'sequelize-typescript'

import { getValue, setValue } from '@/utils/blobAsBase64'

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
  @Column({
    type: DataType.BLOB,
    get(this: WalletAccess) {
      return getValue(this.getDataValue('chest'))
    },
    set(this: WalletAccess, val: string | Buffer) {
      setValue(val, (newVal) => this.setDataValue('chest', newVal))
    },
  })
  chest!: string | Buffer | null

  @AllowNull
  @Column(DataType.STRING(32))
  inviteId!: string | null

  @Column(DataType.STRING(16))
  accessLevel!: AccessLevels

  public toJSON() {
    const curr = super.toJSON() as any
    delete curr.userId
    delete curr.walletId

    return curr
  }
}

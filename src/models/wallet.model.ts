import {
  Table,
  Column,
  BelongsToMany,
  DataType,
  HasMany,
} from 'sequelize-typescript'

import BaseModel from '@/models/base'
import User from '@/models/user.model'
import WalletAccess from '@/models/walletAccess.model'
import Entity from '@/models/entity.model'

@Table
export default class Wallet extends BaseModel<Wallet> {
  @Column(DataType.TEXT)
  encr!: string

  @BelongsToMany(
    () => User,
    () => WalletAccess,
  )
  users!: Array<User & { WalletAccess: WalletAccess }>

  @HasMany(() => Entity)
  entities!: Entity[]
}

export class WalletManager {}

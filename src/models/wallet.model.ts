import { Table, Column, BelongsToMany, DataType } from 'sequelize-typescript'
import BaseModel from './base'
import User from './user.model'
import WalletAccess from './walletAccess.model'

@Table
export default class Wallet extends BaseModel<Wallet> {
  @Column(DataType.TEXT)
  encr!: string

  @BelongsToMany(
    () => User,
    () => WalletAccess,
  )
  users!: Array<User & { WalletAccess: WalletAccess }>
}

import {
  Table,
  Column,
  DataType,
  AllowNull,
  ForeignKey,
} from 'sequelize-typescript'
import BaseModel from './base'
import Subscription from './subscription.model'
import Product from './product.model'

export enum TransactionTypes {
  purchase = 'purchase',
  viral = 'viral',
  manual = 'manual',
}

@Table
export default class Transaction extends BaseModel<Transaction> {
  @Column(
    DataType.ENUM(
      TransactionTypes.purchase,
      TransactionTypes.viral,
      TransactionTypes.manual,
    ),
  )
  type!: TransactionTypes

  @AllowNull
  @Column(DataType.DATE)
  expiredOld!: Date | null

  @Column(DataType.DATE)
  expiredNew!: Date

  @ForeignKey(() => Subscription)
  @Column
  subscriptionId!: string

  // Null is for a transaction assigned manually
  @ForeignKey(() => Product)
  @AllowNull
  @Column(DataType.STRING)
  productId!: string | null

  @Column
  remoteTransactionId!: string

  @Column(DataType.JSON)
  events!: Array<any>
}

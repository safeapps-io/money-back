import {
  Table,
  Column,
  ForeignKey,
  DataType,
  AllowNull,
} from 'sequelize-typescript'
import BaseModel from './base'
import Product from './product.model'
import User from './user.model'

/**
 * How cascading works:
 *
 * 1. if you delete Product, Subscriptions and Transactions linking it will be deleted.
 *    So do it only if you're 100% sure what you're doing.
 * 2. if a user deletes themselves, Subscription and Transactions remain untouched, the link
 *    to the user is removed though (SET NULL). We do this because it makes sense for us to
 *    store this data for as long as it's possible.
 * 3. if you delete Subscription, Transactions will be deleted as well
 */

@Table
export default class Subscription extends BaseModel<Subscription> {
  @ForeignKey(() => Product)
  @Column
  productId!: string

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.STRING)
  userId!: string | null

  @Column
  expires!: Date
}

import { Table, Column, HasMany } from 'sequelize-typescript'

import BaseModel, { syncronizableGetUpdates } from './base'
import Transaction from './transaction.model'

@Table
export default class Category extends BaseModel<Category> {
  @Column
  title!: string

  @Column
  color!: string

  @Column
  isIncome!: boolean

  @HasMany(() => Transaction)
  transactions!: Transaction[]
}

export const getCategoryUpdates = syncronizableGetUpdates(Transaction)

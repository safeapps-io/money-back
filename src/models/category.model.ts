import { Table, Column, HasMany } from 'sequelize-typescript'
import * as yup from 'yup'

import BaseModel, { baseScheme } from './base'
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

export const categoryScheme = yup
  .object({
    title: yup
      .string()
      .trim()
      .required()
      .min(1)
      .max(256),
    color: yup
      .string()
      .trim()
      .required()
      .min(1)
      .max(256),
    isIncome: yup.bool().required(),
  })
  .concat(baseScheme)

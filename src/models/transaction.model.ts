import {
  Table,
  Column,
  ForeignKey,
  BelongsTo,
  DataType,
  AllowNull,
} from 'sequelize-typescript'
import yup from 'yup'

import BaseModel, { syncronizableGetUpdates, baseScheme } from './base'
import Category from './category.model'

@Table
export default class Transaction extends BaseModel<Transaction> {
  @Column
  amount!: number

  @Column
  isIncome!: boolean

  @AllowNull
  @Column(DataType.DECIMAL)
  originalAmount!: number | null

  @AllowNull
  @Column(DataType.STRING)
  currency!: string | null

  @AllowNull
  @Column(DataType.STRING)
  description!: string | null

  @AllowNull
  @Column(DataType.NUMBER)
  mcc!: number | null

  @Column
  datetime!: Date

  @Column
  owner!: string

  @Column
  isDraft!: boolean

  @Column(DataType.JSON)
  tags!: string[]

  @ForeignKey(() => Category)
  @Column
  categoryId!: string

  @BelongsTo(() => Category)
  category!: Category
}

export const transactionScheme = yup.object({
  ...baseScheme,
  isIncome: yup.bool().required(),
  isDraft: yup.bool().required(),
  amount: yup.string().required(),
  originalAmount: yup.string().notRequired(),
  currency: yup
    .string()
    .notRequired()
    .trim()
    .max(256),
  description: yup
    .string()
    .notRequired()
    .trim()
    .max(256),
  mcc: yup.number().notRequired(),
  datetime: yup.date().required(),
  owner: yup
    .string()
    .required()
    .min(1)
    .max(256),
  tags: yup
    .array()
    .default([])
    .of(
      yup
        .string()
        .trim()
        .min(1),
    ),
  categoryId: yup
    .string()
    .required()
    .min(1)
    .max(256),
})

export const getTransactionUpdates = syncronizableGetUpdates(Transaction)

import {
  Table,
  Column,
  ForeignKey,
  BelongsTo,
  DataType,
  AllowNull,
} from 'sequelize-typescript'
import * as yup from 'yup'

import BaseModel, { baseScheme } from './base'
import Category from './category.model'
import {
  optionalArrayOfStringsOrString,
  dateAsTimestamp,
} from '@/utils/yupHelpers'

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
  @Column(DataType.STRING)
  mcc!: string | null

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

  public toJSON() {
    const prev = super.toJSON()
    return {
      ...prev,
      datetime: this.datetime.getTime(),
      tags: this.tags,
    }
  }
}

export const transactionScheme = yup
  .object({
    isIncome: yup.bool().required(),
    isDraft: yup.bool().required(),
    amount: yup.string().required(),
    originalAmount: yup
      .string()
      .nullable()
      .notRequired(),
    currency: yup
      .string()
      .notRequired()
      .nullable()
      .trim()
      .max(256),
    description: yup
      .string()
      .notRequired()
      .trim()
      .max(256),
    mcc: yup
      .number()
      .nullable()
      .notRequired(),
    datetime: dateAsTimestamp.required(),
    owner: yup
      .string()
      .required()
      .min(1)
      .max(256),
    tags: optionalArrayOfStringsOrString,
    categoryId: yup
      .string()
      .required()
      .min(1)
      .max(256),
  })
  .concat(baseScheme)

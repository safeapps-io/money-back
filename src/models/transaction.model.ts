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
  optionalString,
} from '@/utils/yupHelpers'

@Table
export default class Transaction extends BaseModel<Transaction> {
  @Column(DataType.DECIMAL)
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

  @Column(DataType.JSON)
  autocompleteData!: {
    mcc?: string
    accNumber?: string
    merchant?: string
    sourceDataHash?: string
  }

  @Column
  datetime!: Date

  @Column(DataType.STRING)
  owner!: string | null

  @Column(DataType.BOOLEAN)
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
    amount: yup.string().required(),
    datetime: dateAsTimestamp.required(),
    isDraft: yup.bool().required(),
    originalAmount: optionalString,
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
    autocompleteData: yup
      .object({
        mcc: optionalString,
        accountNumber: optionalString,
        merchant: optionalString,
        sourceDataHash: optionalString,
      })
      .notRequired()
      .default({}),
    owner: yup
      .string()
      .required()
      .nullable()
      .trim()
      .min(1)
      .max(256),
    categoryId: yup
      .string()
      .required()
      .nullable()
      .trim()
      .min(1)
      .max(256),
    tags: optionalArrayOfStringsOrString,
  })
  .concat(baseScheme)

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
import mccCodeRegistry from '@/core/mcc/mccCodeRegistry'

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

  public get mccCodeDescription() {
    return this.mcc ? mccCodeRegistry[this.mcc] : null
  }

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
      mccCodeDescription: this.mccCodeDescription,
    }
  }
}

export const transactionScheme = yup
  .object({
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
    datetime: yup
      .date()
      .required()
      .transform((_, val) => new Date(val)),
    owner: yup
      .string()
      .required()
      .min(1)
      .max(256),
    tags: yup
      .string()
      .transform((_, originalValue) =>
        JSON.stringify(originalValue.map((i: string) => i.trim())),
      ),
    categoryId: yup
      .string()
      .required()
      .min(1)
      .max(256),
  })
  .concat(baseScheme)

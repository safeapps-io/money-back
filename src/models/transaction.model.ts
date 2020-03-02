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

export enum TransactionTypes {
  usual = 'usual',
  correction = 'correction',
  balanceReference = 'balanceReference',
}

@Table
export default class Transaction extends BaseModel<Transaction> {
  @Column(DataType.STRING)
  type!: TransactionTypes

  @AllowNull
  @Column(DataType.BOOLEAN)
  isActiveReference!: boolean | null

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
  @Column(DataType.JSON)
  autocompleteData!: {
    mcc?: string
    accNumber?: string
    merchant?: string
    sourceDataHash?: string
  } | null

  @Column
  datetime!: Date

  @AllowNull
  @Column(DataType.STRING)
  owner!: string | null

  @AllowNull
  @Column(DataType.BOOLEAN)
  isDraft!: boolean | null

  @AllowNull
  @Column(DataType.JSON)
  tags!: string[] | null

  @AllowNull
  @ForeignKey(() => Category)
  @Column(DataType.STRING)
  categoryId!: string | null

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

const requiredForUsualTransaction = yup.string().when('type', {
  is: TransactionTypes.usual,
  then: yup
    .string()
    .required()
    .min(1)
    .max(256),
  otherwise: yup
    .string()
    .notRequired()
    .nullable()
    .transform(() => null),
})

export const transactionScheme = yup
  .object({
    // Required data that is common between balance and usual transactions
    type: yup
      .string()
      .required()
      .oneOf([
        TransactionTypes.balanceReference,
        TransactionTypes.correction,
        TransactionTypes.usual,
      ]),
    isIncome: yup.bool().required(),
    amount: yup.string().required(),
    datetime: dateAsTimestamp.required(),

    // Other
    isActiveReference: yup.bool().when('type', {
      is: TransactionTypes.balanceReference,
      then: yup.bool().required(),
      otherwise: yup
        .bool()
        .notRequired()
        .nullable()
        .transform(() => null),
    }),

    isDraft: yup.bool().when('type', {
      is: TransactionTypes.usual,
      then: yup.bool().required(),
      otherwise: yup
        .bool()
        .notRequired()
        .nullable()
        .transform(() => null),
    }),
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
    autocompleteData: yup.object().when('type', {
      is: TransactionTypes.usual,
      then: yup
        .object({
          mcc: optionalString,
          accountNumber: optionalString,
          merchant: optionalString,
          sourceDataHash: optionalString,
        })
        .notRequired()
        .default({}),
      otherwise: yup
        .object()
        .notRequired()
        .transform(() => ({})),
    }),
    owner: requiredForUsualTransaction,
    categoryId: requiredForUsualTransaction,
    tags: optionalArrayOfStringsOrString,
  })
  .concat(baseScheme)

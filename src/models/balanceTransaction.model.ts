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
import { dateAsTimestamp } from '@/utils/yupHelpers'
import SearchFilter from './searchFilter.model'

export enum BalanceTransactionTypes {
  correction = 'correction',
  balanceReference = 'balanceReference',
}

@Table
export default class BalanceTransaction extends BaseModel<BalanceTransaction> {
  @Column(DataType.STRING)
  type!: BalanceTransactionTypes

  @AllowNull
  @Column(DataType.BOOLEAN)
  isActiveReference!: boolean | null

  @Column(DataType.DECIMAL)
  amount!: number

  @Column
  datetime!: Date

  @ForeignKey(() => SearchFilter)
  @Column
  searchFilterId!: string

  @BelongsTo(() => SearchFilter)
  searchFilter!: SearchFilter

  public toJSON() {
    const prev = super.toJSON()
    return {
      ...prev,
      datetime: this.datetime.getTime(),
    }
  }
}

export const balanceTransactionScheme = yup
  .object({
    type: yup
      .string()
      .required()
      .oneOf([
        BalanceTransactionTypes.balanceReference,
        BalanceTransactionTypes.correction,
      ]),
    amount: yup.string().required(),
    datetime: dateAsTimestamp.required(),
    searchFilterId: yup.string().required(),
    isActiveReference: yup.bool().when('type', {
      is: BalanceTransactionTypes.balanceReference,
      then: yup.bool().required(),
      otherwise: yup
        .bool()
        .notRequired()
        .nullable()
        .transform(() => null),
    }),
  })
  .concat(baseScheme)

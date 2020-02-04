import { Table, Column } from 'sequelize-typescript'
import * as yup from 'yup'

import BaseModel, { baseScheme } from './base'

@Table
export default class IgnoredTransaction extends BaseModel<IgnoredTransaction> {
  @Column
  hash!: string
}

export const ignoredTransactionScheme = yup
  .object({
    hash: yup
      .string()
      .required()
      .min(1)
      .max(256),
  })
  .concat(baseScheme)

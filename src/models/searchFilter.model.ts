import { Table, Column } from 'sequelize-typescript'
import * as yup from 'yup'

import BaseModel, { baseScheme } from './base'

@Table
export default class SearchFilter extends BaseModel<SearchFilter> {
  @Column
  title!: string

  @Column
  query!: string
}

export const searchFilterScheme = yup
  .object({
    title: yup
      .string()
      .trim()
      .required()
      .min(1)
      .max(256),
    query: yup
      .string()
      .trim()
      .required()
      .min(1)
      .max(256),
  })
  .concat(baseScheme)

import { Table, Column, DataType } from 'sequelize-typescript'
import * as yup from 'yup'

import BaseModel, { baseScheme } from './base'
import { optionalArrayOfStringsOrString } from '@/utils/yupHelpers'

@Table
export default class SearchFilter extends BaseModel<SearchFilter> {
  @Column
  title!: string

  @Column(DataType.JSON)
  parameters!: SearchFilterParameters

  public toJSON() {
    const prev = super.toJSON()
    return {
      ...prev,
      parameters: this.parameters,
    }
  }
}

interface SearchFilterParameters {
  datetime?:
    | {
        type: 'calendar'
        period: 'week' | 'month' | 'quarter' | 'year'
      }
    | { type: 'dates'; startDate: number; endDate: number }
  category?: {
    oneOf: string[]
    noneOf: string[]
  }
  tag?: {
    oneOf: string[]
    noneOf: string[]
  }
}

export const searchFilterScheme = yup
  .object({
    title: yup
      .string()
      .trim()
      .required()
      .min(1)
      .max(256),
    parameters: yup
      .object({
        datetime: yup
          .object({
            type: yup.string().oneOf(['calendar', 'dates']),
            period: yup.string().when('type', {
              is: 'calendar',
              then: yup.string().oneOf(['week', 'month', 'quarter', 'year']),
            }),
            startDate: yup.date().when('type', {
              is: 'dates',
              then: yup
                .date()
                .transform((_, val) => new Date(val))
                .required(),
            }),
            endDate: yup.date().when('type', {
              is: 'dates',
              then: yup
                .date()
                .transform((_, val) => (val ? new Date(val) : null))
                .required(),
            }),
          })
          .notRequired(),
        category: yup
          .object({
            include: optionalArrayOfStringsOrString,
            exclude: optionalArrayOfStringsOrString,
          })
          .notRequired(),
        tag: yup
          .object({
            include: optionalArrayOfStringsOrString,
            exclude: optionalArrayOfStringsOrString,
          })
          .notRequired(),
      })
      .notRequired(),
  })
  .concat(baseScheme)

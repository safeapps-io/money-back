import {
  Table,
  Column,
  DataType,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import * as yup from 'yup'

import BaseModel, { baseScheme } from './base'
import { optionalArrayOfStringsOrString } from '@/utils/yupHelpers'

export enum BalanceType {
  independent = 'independent',
  reference = 'reference',
}

@Table
export default class SearchFilter extends BaseModel<SearchFilter> {
  @Column
  title!: string

  @AllowNull
  @Column(DataType.STRING)
  balanceType!: BalanceType

  @ForeignKey(() => SearchFilter)
  @Column(DataType.STRING)
  sharedBalanceSearchFilterId!: string | null

  @BelongsTo(() => SearchFilter, {
    foreignKey: {
      allowNull: true,
    },
  })
  sharedBalanceSearchFilter!: SearchFilter

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

export enum SearchFilterDateTypes {
  calendar = 'calendar',
  dates = 'dates',
}
export enum SearchFilterDatePeriods {
  week = 'week',
  month = 'month',
  quarter = 'quarter',
  year = 'year',
}

interface SearchFilterParameters {
  datetime?:
    | {
        type: SearchFilterDateTypes.calendar
        period: SearchFilterDatePeriods
      }
    | { type: SearchFilterDateTypes.dates; startDate: number; endDate: number }
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
    balanceType: yup
      .string()
      .nullable()
      .oneOf([BalanceType.independent, BalanceType.reference, null]),
    sharedBalanceSearchFilterId: yup.string().when('balanceType', {
      is: BalanceType.reference,
      then: yup.string().required(),
      otherwise: yup
        .string()
        .notRequired()
        .nullable()
        .transform(() => null),
    }),

    parameters: yup
      .object({
        datetime: yup
          .object({
            type: yup
              .string()
              .oneOf([
                SearchFilterDateTypes.calendar,
                SearchFilterDateTypes.dates,
              ]),
            period: yup.string().when('type', {
              is: SearchFilterDateTypes.calendar,
              then: yup
                .string()
                .oneOf([
                  SearchFilterDatePeriods.month,
                  SearchFilterDatePeriods.week,
                  SearchFilterDatePeriods.quarter,
                  SearchFilterDatePeriods.year,
                ]),
            }),
            startDate: yup.date().when('type', {
              is: SearchFilterDateTypes.dates,
              then: yup
                .date()
                .transform((_, val) => new Date(val))
                .required(),
            }),
            endDate: yup.date().when('type', {
              is: SearchFilterDateTypes.dates,
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

import { Table, Column, DataType, AllowNull } from 'sequelize-typescript'
import { Op } from 'sequelize'

import BaseModel from '@/models/base'

@Table
export default class Scheme extends BaseModel {
  @Column
  title!: string
  @Column
  published!: boolean

  @Column
  encoding!: string
  @Column
  header!: boolean

  @Column
  decimalDelimiterChar!: string
  @Column
  transformDateFormat!: string
  @Column(DataType.JSON)
  fieldnameMap!: Array<
    'amount' | 'datetime' | 'originalAmount' | 'currency' | null
  >

  @AllowNull
  @Column(DataType.STRING)
  delimiter?: string | null
  @AllowNull
  @Column(DataType.STRING)
  newline?: string | null
  @AllowNull
  @Column(DataType.STRING)
  quoteChar?: string | null
  @AllowNull
  @Column(DataType.STRING)
  escapeChar?: string | null
}

export class SchemeManager {
  static getUpdatedSchemes(fromDate: number) {
    return Scheme.findAll({
      where: { published: true, updated: { [Op.gt]: fromDate } },
    })
  }

  static getById(id: string) {
    return Scheme.findByPk(id)
  }

  static list() {
    return Scheme.findAll()
  }

  static create(data: Scheme) {
    return Scheme.create(data)
  }

  static update(id: string, data: Scheme) {
    return Scheme.update(data, { where: { id } })
  }

  static delete(id: string) {
    return Scheme.destroy({ where: { id } })
  }
}

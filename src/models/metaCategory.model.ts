import { Table, Column, DataType } from 'sequelize-typescript'
import { Op } from 'sequelize'

import BaseModel from '@/models/base'

@Table
export default class MetaCategory extends BaseModel<MetaCategory> {
  @Column
  published!: boolean

  @Column
  isIncome!: boolean

  @Column
  name!: string

  @Column
  color!: string

  @Column(DataType.JSON)
  assignedMcc!: { code: string; weight: number }[]
}

export class MetaCategoryManager {
  static getUpdatedSchemes(fromDate: number) {
    return MetaCategory.findAll({
      where: { published: true, updated: { [Op.gt]: fromDate } },
    })
  }

  static create(data: MetaCategory) {
    return MetaCategory.create(data)
  }
}

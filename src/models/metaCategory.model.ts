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
  assignedMcc!: { code: string; weight: number }[] | null
}

export class MetaCategoryManager {
  static getUpdatedSchemes(fromDate: number) {
    return MetaCategory.findAll({
      where: { published: true, updated: { [Op.gt]: fromDate } },
    })
  }

  static getById(id: string) {
    return MetaCategory.findByPk(id)
  }

  static count() {
    return MetaCategory.count({ where: { published: true } })
  }

  static list(publishedOnly = true) {
    return MetaCategory.findAll({
      where: publishedOnly ? { published: true } : {},
      order: ['name'],
    })
  }

  static create(data: MetaCategory) {
    return MetaCategory.create(data)
  }

  static update(id: string, data: Partial<MetaCategory>) {
    return MetaCategory.update(data, { where: { id } })
  }

  static delete(id: string) {
    return MetaCategory.destroy({ where: { id } })
  }
}

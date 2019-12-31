import {
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  Column,
} from 'sequelize-typescript'
import { Op } from 'sequelize'
import { inspect } from 'util'
import nanoid from 'nanoid'
import yup from 'yup'

export default class BaseModel<T> extends Model<T> {
  @PrimaryKey
  @Column({ defaultValue: nanoid })
  id!: string

  @CreatedAt
  created!: Date

  @UpdatedAt
  updated!: Date;

  [inspect.custom]() {
    return this.toJSON()
  }
}

export const baseScheme = {
  id: yup.string().required(),
  updated: yup.date().notRequired(),
  clientUpdated: yup.date().notRequired(),
}

export function syncronizableGetUpdates(model: any) {
  return (dt?: Date) =>
    model.findAll({
      where: dt && { updated: { [Op.gte]: dt } },
      order: [['updated', 'ASC']],
    })
}

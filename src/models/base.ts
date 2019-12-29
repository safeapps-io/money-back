import {
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  Column,
} from 'sequelize-typescript'
import { inspect } from 'util'
import nanoid = require('nanoid')

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

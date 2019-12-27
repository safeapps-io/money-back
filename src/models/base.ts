import {
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  Column,
} from 'sequelize-typescript'
import { inspect } from 'util'

export default class BaseModel<T> extends Model<T> {
  @PrimaryKey
  @Column
  id!: string

  @CreatedAt
  created!: Date

  @UpdatedAt
  updated!: Date;

  [inspect.custom]() {
    return this.toJSON()
  }
}

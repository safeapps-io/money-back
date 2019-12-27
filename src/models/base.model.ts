import { Model, CreatedAt, UpdatedAt } from 'sequelize-typescript'
import { inspect } from 'util'

export default class BaseModel<T> extends Model<T> {
  @CreatedAt
  created!: Date

  @UpdatedAt
  updated!: Date;

  [inspect.custom]() {
    return this.toJSON()
  }
}

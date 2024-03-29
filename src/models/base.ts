import { inspect } from 'util'
import { Model, CreatedAt, UpdatedAt, PrimaryKey, Column } from 'sequelize-typescript'
import { nanoid } from 'nanoid'

export default class BaseModel extends Model {
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

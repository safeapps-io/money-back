import { Table, Column, DataType, Default } from 'sequelize-typescript'
import BaseModel from '@/models/base'

export enum ProductType {
  money = 'money',
}

@Table
export default class Product extends BaseModel<Product> {
  @Column
  slug!: string

  @Column(DataType.ENUM(...Object.values(ProductType)))
  productType!: ProductType

  @Column
  description!: string

  @Default(false)
  @Column
  default!: boolean

  @Default(true)
  @Column
  active!: boolean

  // Price in $ cents
  @Column
  price!: number

  @Default(12)
  @Column
  duration!: number
}

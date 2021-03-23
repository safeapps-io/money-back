import { Table, Column, DataType, Unique } from 'sequelize-typescript'
import BaseModel from './base'

export enum ProductType {
  money = 'money',
}

@Table
export default class Product extends BaseModel<Product> {
  @Unique
  @Column
  slug!: string

  @Column(DataType.ENUM(ProductType.money))
  productType!: ProductType

  @Column
  default!: boolean

  @Column
  active!: boolean

  // Price in $ cents
  @Column
  price!: number

  // In months
  @Column
  duration!: number
}

import {
  Table,
  Column,
  DataType,
  Default,
  AllowNull,
  HasMany,
} from 'sequelize-typescript'
import BaseModel from '@/models/base'
import Plan from './plan.model'

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
  internalDescription!: string

  @Column
  title!: string

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

  @Default(365)
  @Column
  duration!: number

  @AllowNull
  @Column(DataType.NUMBER)
  trialDuration!: number | null

  @HasMany(() => Plan)
  plans!: Plan[]
}

export class ProductManager {
  static getDefaultProduct(productType: ProductType = ProductType.money) {
    return Product.findOne({
      where: { active: true, productType, default: true },
    })
  }

  static getBySlug(slug: string, productType: ProductType = ProductType.money) {
    return Product.findOne({
      where: { active: true, productType, slug },
    })
  }

  static byId(id: string) {
    return Product.findOne({ where: { id } })
  }
}

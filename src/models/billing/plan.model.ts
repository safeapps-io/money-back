import {
  Table,
  Column,
  ForeignKey,
  DataType,
  AllowNull,
  Default,
  HasMany,
  BelongsTo,
  Index,
} from 'sequelize-typescript'
import { Op } from 'sequelize'
import { Includeable } from 'sequelize/types'

import BaseModel from '@/models/base'
import Product, { ProductType } from './product.model'
import User from '@/models/user.model'
import ChargeEvent from './chargeEvent.model'

/**
 * How cascading works:
 *
 * 1. if you delete Product, Plan and ChargeHistory linking to it will be deleted.
 *    So do it only if you're 100% sure what you're doing.
 * 2. if a user deletes themselves, Plan and ChargeHistory remain untouched, the link
 *    to the user is removed though (SET NULL). We do this because it makes sense for us to
 *    store this data for as long as it's possible.
 * 3. if you delete Plan, ChargeHistory will be deleted as well. Can't think of when it would
 *    be useful to store ChargeHistory in that case, as well as when it is useful to delete
 *    Plans.
 */

@Table
export default class Plan extends BaseModel<Plan> {
  // productId and userId are UNIQUE together, so one user can only have one subscription
  // for one product
  @BelongsTo(() => Product, { onDelete: 'CASCADE' })
  product!: Product

  @ForeignKey(() => Product)
  @Column
  productId!: string

  @AllowNull
  @Index
  @ForeignKey(() => User)
  @Column(DataType.STRING)
  userId!: string | null

  @BelongsTo(() => User)
  user!: User | null

  @AllowNull
  @Column(DataType.DATE)
  expires!: Date | null

  @Default(false)
  @Column
  automaticCharge!: boolean

  @HasMany(() => ChargeEvent)
  chargeEvents!: ChargeEvent[]
}

export class PlanManager {
  static create(userId: string, productId: string) {
    return Plan.create({ userId, productId }, { include: [{ model: Product }] })
  }

  static byUserId(
    userId: string,
    productType: ProductType,
    includeCharges = false,
  ) {
    const include: Includeable[] = [{ model: Product, where: { productType } }]
    if (includeCharges) include.push({ model: ChargeEvent })

    return Plan.findOne({
      where: { userId },
      include,
    })
  }

  static allByUserId(userId: string) {
    return Plan.findAll({ where: { userId }, include: [{ model: Product }] })
  }

  static byRemoteChargeId(chargeId: string) {
    return Plan.findOne({
      include: [
        { model: ChargeEvent, where: { remoteChargeId: chargeId } },
        { model: Product },
      ],
    })
  }

  static findExpiringPlans(start: Date, end: Date) {
    return Plan.findAll({
      where: {
        expires: {
          [Op.gt]: start,
          [Op.lt]: end,
        },
        userId: { [Op.not]: null },
      },
      include: [{ model: ChargeEvent }, { model: User }],
    })
  }

  static byId(id: string) {
    return Plan.findByPk(id)
  }

  static update(id: string, data: Partial<Plan>) {
    return Plan.update(data, { where: { id } })
  }
}

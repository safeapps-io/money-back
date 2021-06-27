import {
  Table,
  Column,
  DataType,
  AllowNull,
  ForeignKey,
  Index,
} from 'sequelize-typescript'
import BaseModel from '@/models/base'
import Plan from './plan.model'
import Product from './product.model'

export enum EventTypes {
  created = 'created',
  pending = 'pending',
  confirmed = 'confirmed',
  failed = 'failed',
  refunded = 'refunded',
}

export enum ChargeTypes {
  trial = 'trial',
  purchase = 'purchase',
  viral = 'viral',
  manual = 'manual',
}

export enum ChargeProviders {
  coinbase = 'coinbase',
  tinkoff = 'tinkoff',
}

@Table
export default class ChargeEvent extends BaseModel {
  @Column(DataType.ENUM(...Object.values(EventTypes)))
  eventType!: EventTypes

  @Column(DataType.ENUM(...Object.values(ChargeTypes)))
  chargeType!: ChargeTypes

  @AllowNull
  @Column(DataType.ENUM(...Object.values(ChargeProviders)))
  provider!: ChargeProviders | null

  @AllowNull
  @Column(DataType.DATE)
  expiredOld!: Date | null

  @AllowNull
  @Column(DataType.DATE)
  expiredNew!: Date | null

  @ForeignKey(() => Product)
  @AllowNull
  @Column(DataType.STRING)
  productId!: string | null

  @ForeignKey(() => Plan)
  @Index
  @Column
  planId!: string

  @AllowNull
  @Column(DataType.STRING)
  remoteChargeId!: string | null

  @AllowNull
  @Column(DataType.JSON)
  rawData!: string | null
}

export type EventChargeData = Partial<ChargeEvent> &
  Pick<ChargeEvent, 'eventType' | 'chargeType' | 'planId'>

export class ChargeEventManager {
  static create(charge: EventChargeData) {
    return ChargeEvent.create(charge)
  }

  static isRemoteIdAndEventTypeExists(remoteId: string, eventType: EventTypes) {
    return ChargeEvent.count({ where: { eventType, remoteChargeId: remoteId } })
  }

  static deleteByPlanAndId(id: string, planId: string) {
    return ChargeEvent.destroy({ where: { id, planId } })
  }
}

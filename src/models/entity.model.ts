import {
  Table,
  Column,
  ForeignKey,
  BelongsTo,
  DataType,
} from 'sequelize-typescript'
import { Op } from 'sequelize'

import BaseModel from '@/models/base'
import Wallet from '@/models/wallet.model'

@Table
export default class Entity extends BaseModel<Entity> {
  @Column(DataType.TEXT)
  encr!: string

  @ForeignKey(() => Wallet)
  @Column
  walletId!: string

  @BelongsTo(() => Wallet, { onDelete: 'CASCADE' })
  wallet?: Wallet
}

export class EntityManager {
  static filterByIds({ ids, walletId }: { ids: string[]; walletId: string }) {
    return Entity.findAll({ where: { walletId, id: { [Op.in]: ids } } })
  }

  static bulkCreate(entities: Entity[]) {
    return Entity.bulkCreate(entities, { returning: true })
  }

  static updateEntity({
    fetchedEntity,
    newEntity,
  }: {
    fetchedEntity: Entity
    newEntity: Entity
  }) {
    Object.entries(newEntity).forEach(
      ([key, value]) => ((fetchedEntity as any)[key] = value),
    )
    return fetchedEntity.save()
  }

  static getUpdates({
    walletId,
    latestUpdated,
  }: {
    walletId: string
    latestUpdated: Date
  }) {
    return Entity.findAll({
      where: { walletId, updated: { [Op.gt]: latestUpdated } },
      order: [['updated', 'ASC']],
    })
  }
}

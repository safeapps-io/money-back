import {
  Table,
  Column,
  ForeignKey,
  BelongsTo,
  DataType,
} from 'sequelize-typescript'
import { Op } from 'sequelize'
import { encode, decode } from 'base64-arraybuffer'

import BaseModel from '@/models/base'
import Wallet from '@/models/wallet.model'

@Table
export default class Entity extends BaseModel<Entity> {
  @Column({
    type: DataType.BLOB,
    get(this: Entity) {
      const encr = this.getDataValue('encr')
      if (typeof encr === 'string') return encr
      else return encode(encr)
    },
    set(this: Entity, val: string | Buffer) {
      if (typeof val === 'string')
        this.setDataValue('encr', Buffer.from(decode(val)))
      else this.setDataValue('encr', val)
    },
  })
  encr!: Buffer | string

  @ForeignKey(() => Wallet)
  @Column
  walletId!: string

  @BelongsTo(() => Wallet, { onDelete: 'CASCADE' })
  wallet?: Wallet
}

export class EntityManager {
  static byIds({ ids, walletId }: { ids: string[]; walletId: string }) {
    return Entity.findAll({ where: { walletId, id: { [Op.in]: ids } } })
  }

  static bulkCreate(entities: Entity[]) {
    return Entity.bulkCreate(entities, { returning: true })
  }

  static async update(id: string, entity: Partial<Entity>) {
    return (
      await Entity.update(entity, {
        where: { id },
        returning: true,
      })
    )[1][0]
  }

  static getUpdates(
    idToUpdatedMap: {
      walletId: string
      latestUpdated: Date
    }[],
  ) {
    // Single query to fetch data for all the wallets
    const query = {
      [Op.or]: idToUpdatedMap.map(({ walletId, latestUpdated }) => ({
        walletId,
        updated: { [Op.gt]: latestUpdated },
      })),
    }

    return Entity.findAll({
      where: query,
      order: [['updated', 'ASC']],
    })
  }
}

import { Table, Column, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { Op } from 'sequelize'
import { nanoid } from 'nanoid'

import BaseModel from '@/models/base'
import User from '@/models/user.model'

@Table
export default class RefreshToken extends BaseModel<RefreshToken> {
  @Column({ defaultValue: () => nanoid(50) })
  key!: string

  @ForeignKey(() => User)
  @Column
  userId!: string

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user!: User

  @Column
  description!: string

  public toJSON() {
    const { id, description, created } = super.toJSON() as any
    return { id, description, created, current: false } as any
  }
}

export class RefreshTokenManager {
  static create(data: {
    userId: string
    description?: string
  }): Promise<RefreshToken> {
    return RefreshToken.create(data)
  }

  static destroy(data: { userId: string; key: string }) {
    return RefreshToken.destroy({ where: data })
  }

  static async exists({
    token,
    userId,
  }: {
    token: string
    userId: string
  }): Promise<boolean> {
    const count = await RefreshToken.count({
      where: { key: token, userId },
    })

    return count !== 0
  }

  static async byUserId(userId: string) {
    return RefreshToken.findAll({ where: { userId } })
  }

  static async destroyByIds({
    ids,
    userId,
  }: {
    ids: string[]
    userId: string
  }) {
    return RefreshToken.destroy({ where: { id: { [Op.in]: ids }, userId } })
  }
}

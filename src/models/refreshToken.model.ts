import { Table, Column, ForeignKey, BelongsTo, Index } from 'sequelize-typescript'
import { Op } from 'sequelize'
import { nanoid } from 'nanoid'

import BaseModel from '@/models/base'
import User from '@/models/user.model'

@Table
export default class RefreshToken extends BaseModel {
  @Column({ defaultValue: () => nanoid(50) })
  key!: string

  @ForeignKey(() => User)
  @Index
  @Column
  userId!: string

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user!: User

  @Column
  description!: string
}

export class RefreshTokenManager {
  static create(data: { userId: string; description?: string }): Promise<RefreshToken> {
    return RefreshToken.create(data)
  }

  static destroy(data: { userId: string; key: string }) {
    return RefreshToken.destroy({ where: data })
  }

  static async exists({ token, userId }: { token: string; userId: string }): Promise<boolean> {
    const count = await RefreshToken.count({
      where: { key: token, userId },
    })

    return count !== 0
  }

  static async byUserId(userId: string) {
    return RefreshToken.findAll({ where: { userId } })
  }

  static async destroyById({ id, userId }: { id: string; userId: string }) {
    return RefreshToken.destroy({ where: { id, userId } })
  }

  static async destroyAllButOneKey({ key, userId }: { key: string; userId: string }) {
    return RefreshToken.destroy({ where: { key: { [Op.not]: key }, userId } })
  }
}

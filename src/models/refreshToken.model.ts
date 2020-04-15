import { Table, Column, ForeignKey, BelongsTo } from 'sequelize-typescript'
import nanoid from 'nanoid'

import BaseModel from './base'
import User from './user.model'

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
}

export class RefreshTokenManager {
  static generateToken(data: {
    userId: string
    description?: string
  }): Promise<RefreshToken> {
    return RefreshToken.create(data)
  }

  static async tokenExists({
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
}

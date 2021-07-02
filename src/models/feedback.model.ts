import {
  Table,
  Column,
  ForeignKey,
  BelongsTo,
  DataType,
  Index,
  AllowNull,
} from 'sequelize-typescript'
import sequelize, { FindOptions, Op } from 'sequelize'

import BaseModel from '@/models/base'
import User from '@/models/user.model'

@Table
export default class Feedback extends BaseModel {
  @ForeignKey(() => User)
  @Column(DataType.STRING)
  userId!: string

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user!: User

  @AllowNull
  @Index
  @Column(DataType.STRING)
  email!: string | null

  @Column
  description!: string
}

export class FeedbackManager {
  static list(query?: string) {
    let opts: FindOptions<Feedback> = {
      include: [{ model: User, required: true }],
    }
    if (query) {
      opts = {
        ...opts,
        where: {
          [Op.or]: [
            { id: query },
            { userId: query },
            { email: query },
            { '$user.username$': query },
            { '$user.email$': query },
          ],
        },
      }
    }

    return Feedback.findAll({ ...opts })
  }

  static getById(id: string) {
    return Feedback.findByPk(id)
  }

  static create(data: { description: string; userId: string; email?: string }) {
    return Feedback.create(data)
  }
}

import {
  Table,
  Column,
  Unique,
  DataType,
  AllowNull,
  HasMany,
} from 'sequelize-typescript'

import BaseModel from './base'
import { Op } from 'sequelize'
import RefreshToken from './refreshToken.model'

@Table
export default class User extends BaseModel<User> {
  @Unique
  @Column
  username!: string

  @AllowNull
  @Unique
  @Column(DataType.STRING)
  email!: string | null

  @Column
  password!: string

  @HasMany(() => RefreshToken)
  refreshTokens!: RefreshToken[]

  public toJSON() {
    const prev = super.toJSON()
    const curr = { ...prev, password: '' }
    delete curr.password

    return curr
  }
}

export class UserManager {
  static createUser(data: {
    email?: string
    username: string
    password: string
  }) {
    return User.create(data)
  }

  static getUserById(userId: string) {
    return User.findByPk(userId)
  }

  static async isUsernameTaken(username: string) {
    const count = await User.count({ where: { username } })
    return count !== 0
  }

  static async isEmailTaken(email: string) {
    const count = await User.count({ where: { email } })
    return count !== 0
  }

  static findUser(usernameOrEmail: string) {
    return User.findOne({
      where: { [Op.or]: { username: usernameOrEmail, email: usernameOrEmail } },
    })
  }

  static changeUserPassword(userId: string, password: string) {
    return User.update({ password }, { where: { id: userId } })
  }
}

import { Table, Column, DataType, AllowNull } from 'sequelize-typescript'
import BaseModel from './base.model'

export enum UserTypes {
  regular,
  moderator,
  admin,
}

@Table
export default class User extends BaseModel<User> {
  @Column
  public username!: string

  @Column(DataType.INTEGER)
  public type!: UserTypes

  @AllowNull
  @Column
  public birthday!: Date
}

export const searchUsers = (type: UserTypes) =>
  User.findAll({ where: { type } })

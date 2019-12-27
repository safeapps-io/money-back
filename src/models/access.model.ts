import { Table, Column } from 'sequelize-typescript'
import BaseModel from './base.model'
import nanoid = require('nanoid')

@Table
export default class Access extends BaseModel<Access> {
  @Column
  public key!: string
}

export const isAccessValid = async (key: string) =>
  !!(await Access.findOne({ where: { key } }))

export const createAccess = () => Access.create({ hex: nanoid(35) })

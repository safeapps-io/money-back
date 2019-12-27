import { Table, Column } from 'sequelize-typescript'
import nanoid from 'nanoid'

import BaseModel from './base'

@Table
export default class Access extends BaseModel<Access> {
  @Column
  key!: string
}

export const isAccessValid = async (key: string) =>
  !!(await Access.findOne({ where: { key } }))

export const createAccess = () => Access.create({ hex: nanoid(35) })

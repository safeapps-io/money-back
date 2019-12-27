import { Table, Column } from 'sequelize-typescript'

import BaseModel from './base'

@Table
export default class SearchFilter extends BaseModel<SearchFilter> {
  @Column
  title!: string

  @Column
  query!: string
}

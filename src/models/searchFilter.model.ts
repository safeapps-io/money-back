import { Table, Column } from 'sequelize-typescript'

import BaseModel, { syncronizableGetUpdates } from './base'

@Table
export default class SearchFilter extends BaseModel<SearchFilter> {
  @Column
  title!: string

  @Column
  query!: string
}

export const getSearchFilterUpdates = syncronizableGetUpdates(SearchFilter)

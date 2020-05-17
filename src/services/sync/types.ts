import Entity from '@/models/entity.model'

export type UpdatedEntity = {
  clientUpdated?: number
} & Entity

export type ClientChangesData = {
  walletId: string
  entities: UpdatedEntity[]
  latestUpdated: number
}[]

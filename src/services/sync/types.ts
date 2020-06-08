import Entity from '@/models/entity.model'

export type ClientUpdated<T> = {
  clientUpdated?: number
} & T
export type EntityUpdated = ClientUpdated<Entity>

export type ClientChangesData = {
  [walletId: string]: {
    entities: EntityUpdated[]
    latestUpdated: number
  }
}

export type ServerUpdatesMap = {
  walletId: string
  latestUpdated: Date
}[]

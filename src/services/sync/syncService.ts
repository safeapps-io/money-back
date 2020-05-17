import * as yup from 'yup'

import { dateAsTimestamp, runSchemaWithFormError } from '@/utils/yupHelpers'

import Entity, { EntityManager } from '@/models/entity.model'
import { WalletService } from '@/services/wallet/walletService'
import { UpdatedEntity, ClientChangesData } from './types'

export class SyncService {
  private static async handleWalletUpdates({
    entities,
    walletId,
    userId,
  }: {
    entities: UpdatedEntity[]
    walletId: string
    userId: string
  }) {
    if (!entities.length) return
    try {
      await WalletService.checkIfUserHasAccess({ userId, walletId })
    } catch (error) {
      return
    }

    const createEntities = [] as Entity[],
      updateEntities = [] as UpdatedEntity[],
      updateEntitiesIds = [] as string[]

    for (const ent of entities) {
      if (ent.updated) {
        updateEntities.push(ent)
        updateEntitiesIds.push(ent.id)
      } else createEntities.push(ent)
    }

    if (createEntities.length) await EntityManager.bulkCreate(createEntities)

    if (updateEntities.length) {
      const fetchedEntities = await EntityManager.filterByIds({
          walletId,
          ids: updateEntitiesIds,
        }),
        fetchedEntitiesById = fetchedEntities.reduce((acc, curr) => {
          acc[curr.id] = curr
          return acc
        }, {} as { [id: string]: Entity }),
        promises = []

      for (const entityToUpdate of updateEntities) {
        const fetchedEntity = fetchedEntitiesById[entityToUpdate.id]
        if (!entityToUpdate.clientUpdated || !fetchedEntity) continue

        if (entityToUpdate.clientUpdated >= fetchedEntity.updated.getTime())
          promises.push(
            EntityManager.updateEntity({
              fetchedEntity,
              newEntity: entityToUpdate,
            }),
          )
      }
      await Promise.all(promises)
    }
  }

  private static entitiesUpdateSchema = yup.array(
    yup
      .object({
        id: yup.string().required(),
        created: dateAsTimestamp.notRequired(),
        updated: dateAsTimestamp.notRequired(),
        clientUpdated: dateAsTimestamp.required(),
        walletId: yup.string().required(),
        encr: yup.string().required(),
      })
      .noUnknown(),
  )
  static async handleClientUpdates({
    userId,
    entityMap,
  }: {
    userId: string
    entityMap: ClientChangesData
  }) {
    await Promise.all(
      entityMap.map(({ entities: unfilteredEntities, walletId }) => {
        const entities = unfilteredEntities.filter(
          ent => ent.walletId === walletId,
        )
        runSchemaWithFormError(this.entitiesUpdateSchema, entities)
        return this.handleWalletUpdates({ entities, walletId, userId })
      }),
    )

    return (
      await Promise.all(
        entityMap.map(({ walletId, latestUpdated }) =>
          this.getServerUpdates({ walletId, userId, latestUpdated }),
        ),
      )
    ).flatMap(i => i)
  }

  static async getServerUpdates({
    userId,
    walletId,
    latestUpdated,
  }: {
    userId: string
    walletId: string
    latestUpdated: number
  }) {
    try {
      await WalletService.checkIfUserHasAccess({ userId, walletId })
    } catch (error) {
      return []
    }

    return EntityManager.getUpdates({
      walletId,
      latestUpdated: new Date(latestUpdated),
    })
  }
}

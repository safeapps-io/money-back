import * as yup from 'yup'

import { dateAsTimestamp, runSchemaWithFormError } from '@/utils/yupHelpers'

import Entity, { EntityManager } from '@/models/entity.model'
import { WalletService } from '@/services/wallet/walletService'
import { ClientChangesData, EntityUpdated } from './types'
import { SyncPubSubService } from './syncPubSubService'

export class SyncService {
  private static async handleUpdatesByWallet({
    entities,
    walletId,
    socketId,
  }: {
    entities: EntityUpdated[]
    walletId: string
    socketId: string
  }) {
    if (!entities.length) return

    const createEntities = [] as Entity[],
      updateEntities = [] as EntityUpdated[],
      updateEntitiesIds = [] as string[]

    for (const ent of entities) {
      if (ent.updated) {
        updateEntities.push(ent)
        updateEntitiesIds.push(ent.id)
      } else createEntities.push(ent)
    }

    const results: Entity[] = [],
      promises = []

    if (createEntities.length)
      results.push(...(await EntityManager.bulkCreate(createEntities)))

    if (updateEntities.length) {
      const fetchedEntities = await EntityManager.byIds({
          walletId,
          ids: updateEntitiesIds,
        }),
        fetchedEntitiesById = fetchedEntities.reduce((acc, curr) => {
          acc[curr.id] = curr
          return acc
        }, {} as { [id: string]: Entity })

      for (const entityToUpdate of updateEntities) {
        const fetchedEntity = fetchedEntitiesById[entityToUpdate.id]

        if (!entityToUpdate.clientUpdated || !fetchedEntity) continue
        if (entityToUpdate.clientUpdated < fetchedEntity.updated.getTime())
          continue

        // We don't want it to be updated from client side, but we need it to decide if the entity is to
        // be created or updated
        delete entityToUpdate.updated

        promises.push(EntityManager.update(fetchedEntity.id, entityToUpdate))
      }

      results.push(...(await Promise.all(promises)))
    }

    return SyncPubSubService.publishEntitiesUpdates({
      data: results,
      walletId,
      socketId,
    })
  }

  private static entitiesUpdateSchema = yup.array(
    yup.object({
      id: yup.string().required(),
      updated: dateAsTimestamp.notRequired(),
      clientUpdated: dateAsTimestamp.required(),
      walletId: yup.string().required(),
      encr: yup.string().required(),
    }),
  )
  static async handleClientUpdates({
    userId,
    socketId,
    entityMap: unfilteredEntityMap,
  }: {
    userId: string
    socketId: string
    entityMap: ClientChangesData
  }) {
    // Only allow access to user's wallets, filter other data out
    const usersWalletIds = await WalletService.getUserWalletIds(userId),
      entityMap = Object.entries(unfilteredEntityMap).reduce(
        (acc, [walletId, entities]) => {
          if (usersWalletIds.includes(walletId)) acc[walletId] = entities
          return acc
        },
        {} as ClientChangesData,
      )

    await Promise.all(
      Object.entries(entityMap).map(
        ([walletId, { entities: unfilteredEntities }]) => {
          // It's a bit of a stretch. User can change wallet id for some other, and send it to backend.
          // Will never happen in real life, but HACKERS ARE EVERYWHERE
          const entities = unfilteredEntities.filter(
            ent => ent.walletId === walletId,
          )
          runSchemaWithFormError(this.entitiesUpdateSchema, entities)
          return this.handleUpdatesByWallet({
            entities,
            walletId,
            socketId,
          })
        },
      ),
    )

    return this.getServerUpdates(entityMap)
  }

  private static async getServerUpdates(entityMap: ClientChangesData) {
    const map = Object.entries(entityMap).map(
      ([walletId, { latestUpdated }]) => ({
        walletId,
        latestUpdated: new Date(latestUpdated),
      }),
    )

    return EntityManager.getUpdates(map)
  }
}

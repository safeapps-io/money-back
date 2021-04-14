import * as yup from 'yup'

import { runSchemaWithFormError, requiredString } from '@/utils/yupHelpers'

import Entity, { EntityManager } from '@/models/entity.model'
import Wallet from '@/models/wallet.model'
import { WalletService } from '@/services/wallet/walletService'
import { BillingService } from '@/services/billing/billingService'
import { ClientChangesData, EntityUpdated, ServerUpdatesMap } from './types'
import { publishEntityUpdate } from './syncEvents'

export class SyncService {
  private static async handleUpdatesByWallet({
    entities,
    wallet,
    clientId,
  }: {
    entities: EntityUpdated[]
    wallet: Wallet
    clientId: string
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
          walletId: wallet.id,
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
        // @ts-ignore
        delete entityToUpdate.updated

        promises.push(EntityManager.update(fetchedEntity.id, entityToUpdate))
      }

      results.push(...(await Promise.all(promises)))
    }

    return publishEntityUpdate({
      wallet,
      clientId,
      entities: results,
    })
  }

  private static entitiesUpdateSchema = yup.array(
    yup
      .object({
        id: requiredString,
        updated: yup.number().positive().notRequired(),
        clientUpdated: yup.number().positive().required(),
        walletId: requiredString,
        encr: requiredString,
      })
      .noUnknown(),
  )
  static async handleClientUpdates({
    userId,
    clientId,
    entityMap: unfilteredEntityMap,
  }: {
    userId: string
    clientId: string
    entityMap: ClientChangesData
  }) {
    /**
     * Only allow access to:
     * 1. this user's wallets;
     * 2. wallets which owner has an active subscription.
     *
     * Other data will be filtered out.
     */
    const usersWallets = (
        await WalletService.getUserWallets(userId)
      ).filter((wallet) => BillingService.isMoneySubscriptionActive(wallet)),
      entityMap: {
        entities: EntityUpdated[]
        wallet: Wallet
      }[] = [],
      serverUpdatesMap: ServerUpdatesMap = []

    for (const [walletId, walletChanges] of Object.entries(
      unfilteredEntityMap,
    )) {
      const wallet = usersWallets.find((wallet) => wallet.id === walletId)
      if (!wallet) continue

      serverUpdatesMap.push({
        walletId,
        latestUpdated: new Date(walletChanges.latestUpdated),
      })
      entityMap.push({
        wallet,
        // It's a bit of a stretch. User can change wallet id for some other, and send it to backend.
        // Will never happen in real life, but HACKERS ARE EVERYWHERE
        entities: walletChanges.entities.filter(
          (ent) => ent.walletId === wallet.id,
        ),
      })
    }

    await Promise.all(
      entityMap.map(({ entities, wallet }) => {
        runSchemaWithFormError(this.entitiesUpdateSchema, entities)
        return this.handleUpdatesByWallet({
          wallet,
          entities,
          clientId,
        })
      }),
    )

    return this.getServerUpdates(serverUpdatesMap)
  }

  private static async getServerUpdates(entityMap: ServerUpdatesMap) {
    return EntityManager.getUpdates(entityMap)
  }

  private static entitiesDeleteSchema = yup.array(yup.array(requiredString))
  public static async deleteEntitiesById({
    deleteMap,
    userId,
  }: {
    deleteMap: { [walletId: string]: string[] }
    userId: string
  }) {
    runSchemaWithFormError(this.entitiesDeleteSchema, Object.values(deleteMap))

    const usersWalletIds = (await WalletService.getUserWallets(userId)).map(
      (wallet) => wallet.id,
    )

    Object.keys(deleteMap).forEach(
      (walletId) =>
        !usersWalletIds.includes(walletId) && delete deleteMap[walletId],
    )

    return EntityManager.bulkDelete(deleteMap)
  }
}

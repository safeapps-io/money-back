import { Model } from 'sequelize-typescript'
import { Op } from 'sequelize'
import * as yup from 'yup'

import Category, { categoryScheme } from '@/models/category.model'
import Transaction, { transactionScheme } from '@/models/transaction.model'
import SearchFilter, { searchFilterScheme } from '@/models/searchFilter.model'

export enum ObjectTypes {
  category = 'category',
  searchFilter = 'searchFilter',
  transaction = 'transaction',
}
export type BasicSynchronizableModelRequirements = {
  updated: string | Date
  id: string
  clientUpdated?: string | Date
}

/**
 * A map of type to model's data you'd need to run a syncronization process
 */
export const syncMap: {
  [index in ObjectTypes]: {
    model: typeof Model
    scheme: yup.ObjectSchema
    syncRunner: (
      ent: BasicSynchronizableModelRequirements,
    ) => Promise<false | { type: ObjectTypes; ent: any }>
    getUpdates: (dt?: Date) => Promise<{ type: ObjectTypes; ent: any }[]>
  }
} = {
  [ObjectTypes.category]: {
    model: Category,
    scheme: categoryScheme,
    syncRunner: runSyncValidationAndDbProcessFactory(
      ObjectTypes.category,
      Category,
      categoryScheme,
    ),
    getUpdates: syncronizableGetUpdatesFactory(ObjectTypes.category, Category),
  },
  [ObjectTypes.searchFilter]: {
    model: SearchFilter,
    scheme: searchFilterScheme,
    syncRunner: runSyncValidationAndDbProcessFactory(
      ObjectTypes.searchFilter,
      SearchFilter,
      searchFilterScheme,
    ),
    getUpdates: syncronizableGetUpdatesFactory(
      ObjectTypes.searchFilter,
      SearchFilter,
    ),
  },
  [ObjectTypes.transaction]: {
    model: Transaction,
    scheme: transactionScheme,
    syncRunner: runSyncValidationAndDbProcessFactory(
      ObjectTypes.transaction,
      Transaction,
      transactionScheme,
    ),
    getUpdates: syncronizableGetUpdatesFactory(
      ObjectTypes.transaction,
      Transaction,
    ),
  },
}

function runSyncValidationAndDbProcessFactory(
  type: ObjectTypes,
  model: any,
  scheme: yup.ObjectSchema,
) {
  return async (ent: BasicSynchronizableModelRequirements) => {
    let validatedEnt
    try {
      validatedEnt = scheme.cast(ent) as BasicSynchronizableModelRequirements
      scheme.validateSync(validatedEnt)
    } catch (error) {
      console.error(ent, error)
      return false
    }

    if (!validatedEnt.updated) {
      try {
        return { type, ent: await model.create(validatedEnt) }
      } catch (error) {
        console.error(validatedEnt, error)
        return false
      }
    }

    const fetchedModel = await model.findByPk(validatedEnt.id)

    if (
      validatedEnt.clientUpdated &&
      fetchedModel.updated <= new Date(validatedEnt.clientUpdated)
    ) {
      Object.entries(validatedEnt).forEach(
        ([key, value]) => (fetchedModel[key] = value),
      )
      await fetchedModel.save()
      return { type, ent: fetchedModel }
    }

    return false
  }
}

function syncronizableGetUpdatesFactory(type: ObjectTypes, model: any) {
  return async (dt?: Date) =>
    (
      await model.findAll({
        where: dt && { updated: { [Op.gt]: dt } },
        order: [['updated', 'ASC']],
      })
    ).map((ent: any) => ({ type, ent }))
}

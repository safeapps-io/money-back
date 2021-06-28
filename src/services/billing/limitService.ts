import { MetaCategoryManager } from '@/models/metaCategory.model'
import { redisConnection } from '@/services/redis/connection'
import { differenceInMinutes } from 'date-fns'

const redisKey = 'billing:currentLimit'
export const setLimit = (newLimit: number) => redisConnection.set(redisKey, newLimit)

const fallbackDefault = 100
export const getRawLimit = async () => {
  const val = await redisConnection.get(redisKey),
    parsed = parseInt(val || '')

  if (val && !Number.isNaN(parsed)) return parsed
  return fallbackDefault
}

let metaCategoryCount = 0,
  lastFetch = 0

export const getRealLimit = async () => {
  const val = await getRawLimit()

  // Update the amount of meta categories every 10 minutes
  if (differenceInMinutes(new Date(), lastFetch) >= 10) {
    metaCategoryCount = await MetaCategoryManager.count()
    lastFetch = new Date().getTime()
  }

  /**
   * The amount of entities we truly allow to create:
   *
   * The "display" limit
   * + the count of categories that will be created at the very beginning
   * + 1 for wallet data
   * + 1 for wallet user
   * + 1 for default asset
   * + 1 for default search
   */
  return val + metaCategoryCount + 4
}

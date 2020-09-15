import Redis from 'ioredis'
import { redisCreds } from './redisCreds'

export const getRedisClient = (): Redis.Redis => new Redis(redisCreds)

export let subscriptionConnection: Redis.Redis, connection: Redis.Redis
export const initRedisConnection = () => {
  connection = getRedisClient()
  subscriptionConnection = getRedisClient()
}

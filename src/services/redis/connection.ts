import Redis from 'ioredis'
import { redisCreds } from './redisCreds'

export const getRedisClient = (opts?: Redis.RedisOptions): Redis.Redis =>
  new Redis({ ...redisCreds, ...opts })

export let subscriptionConnection: Redis.Redis, connection: Redis.Redis
export const initRedisConnection = () => {
  connection = getRedisClient()
  subscriptionConnection = getRedisClient()
}

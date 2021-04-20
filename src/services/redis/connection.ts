import Redis from 'ioredis'
import { redisCreds } from './redisCreds'

export const getRedisClient = (opts?: Redis.RedisOptions): Redis.Redis =>
  new Redis({ ...redisCreds, ...opts })

export let subscriptionConnection: Redis.Redis, redisConnection: Redis.Redis
export const initRedisConnection = () => {
  redisConnection = getRedisClient()
  subscriptionConnection = getRedisClient()
}

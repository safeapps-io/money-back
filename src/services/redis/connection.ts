import Redis from 'ioredis'

const getClient = () =>
  new Redis({
    port: parseInt(process.env.REDIS_PORT as string),
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB as string),
  })

export let subscriptionConnection: Redis.Redis, connection: Redis.Redis
export const initRedis = () => {
  connection = getClient()
  subscriptionConnection = getClient()
}

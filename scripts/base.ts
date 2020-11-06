import dotenv from 'dotenv'
dotenv.config()

import sequelize from '@/models/setup'

import { initRedisConnection } from '@/services/redis/connection'
import { redisPubSub } from '@/services/redis/pubSub'

export const base = async () => {
  sequelize.sync()
  initRedisConnection()
  redisPubSub.init()
}

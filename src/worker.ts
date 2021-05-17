import dotenv from 'dotenv'
dotenv.config()

import sequelize from '@/models/setup'

import { trackError, trackErrorsInit } from '@/services/trackErrors'
import { setupWorkers } from '@/tasks/workers'
import { initRedisConnection } from '@/services/redis/connection'

trackErrorsInit()

const main = async () => {
  await sequelize.sync()
  initRedisConnection()
  await setupWorkers()
}

main()
  .then(() => {})
  .catch((e) => {
    trackError(e)
    console.error(e)
    process.exit(1)
  })

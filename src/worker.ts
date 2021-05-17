import dotenv from 'dotenv'
dotenv.config()

import sequelize from '@/models/setup'

import { trackError, trackErrorsInit } from '@/services/trackErrors'
import { setupWorkers } from '@/tasks/workers'

trackErrorsInit()

const main = async () => {
  await sequelize.sync()
  await setupWorkers()
}

main()
  .then(() => {})
  .catch((e) => {
    trackError(e)
    console.error(e)
    process.exit(1)
  })

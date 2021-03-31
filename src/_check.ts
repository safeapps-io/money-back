import dotenv from 'dotenv'
dotenv.config()
import sequelize from './models/setup'

async function main() {
  await sequelize.sync()

  // Do stuff here, log it, launch using `yarn run:check`
}

main()
  .then(() => process.exit())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

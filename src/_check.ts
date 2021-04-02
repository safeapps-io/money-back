import dotenv from 'dotenv'
import _ from 'lodash'
dotenv.config()

import sequelize from './models/setup'

async function main() {
  await sequelize.sync()

  // Do stuff here, log it, launch using `yarn run:check`
  console.log(JSON.stringify({}, null, 2))
}

main()
  .then(() => process.exit())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

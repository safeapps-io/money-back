import dotenv from 'dotenv'
dotenv.config()
import sequelize from './models/setup'

import { WalletManager } from './models/wallet.model'

async function main() {
  await sequelize.sync()

  const res = await WalletManager.byUserId('MZCvQr2BS688yYmUzwUVE')
  console.log(JSON.stringify(res, null, 2))
}

main()
  .then(() => process.exit())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

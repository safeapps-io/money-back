import dotenv from 'dotenv'
dotenv.config()

import { setupEmailTransportWorker } from '@/services/message/emailTransport'
import { setupBillingWorker } from '@/services/billing/queues'

const main = () =>
  Promise.all([setupEmailTransportWorker(), setupBillingWorker()])

main()
  .then(() => {})
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

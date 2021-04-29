import dotenv from 'dotenv'
dotenv.config()

import { setupEmailTransportWorker } from '@/services/message/emailTransport'
import { setupBillingWorker } from '@/services/billing/queues'
import { trackError, trackErrorsInit } from '@/services/trackErrors'

trackErrorsInit()

const main = () =>
  Promise.all([setupEmailTransportWorker(), setupBillingWorker()])

main()
  .then(() => {})
  .catch((e) => {
    trackError(e)
    console.error(e)
    process.exit(1)
  })

import dotenv from 'dotenv'
dotenv.config()

import { setupEmailTransportWorker } from '@/services/message/emailTransport'
import { setupBillingWorker } from '@/services/billing/queues'
import { trackError, trackErrorsInit } from '@/services/trackErrors'
import { setupTelegramTransportWorker } from '@/services/message/telegramTransport'
import { setupUserCounterNotificationWorker } from '@/services/user/queues'

trackErrorsInit()

const main = () =>
  Promise.all([
    setupEmailTransportWorker(),
    setupTelegramTransportWorker(),
    setupBillingWorker(),
    setupUserCounterNotificationWorker(),
  ])

main()
  .then(() => {})
  .catch((e) => {
    trackError(e)
    console.error(e)
    process.exit(1)
  })

import { ExchangeRateService } from '@/services/billing/exchangeRate'
import { createTransmission } from '@/services/message/emailTransport'
import { sendTelegramMessage } from '@/services/message/telegramTransport'
import { UserService } from '@/services/user/userService'

import { emailQueue, exchangeRateQueue, telegramQueue, userCounterNotificationQueue } from './queue'

const setupBillingWorker = async () =>
    Promise.all([
      exchangeRateQueue.add(null, {
        // Daily at 10:00
        repeat: { cron: '0 10 * * *' },
      }),
      exchangeRateQueue.process(ExchangeRateService.updateExchangeRate),
    ]),
  setupEmailWorker = async () =>
    emailQueue.process(1000, async (job) => createTransmission(job.data)),
  setupTelegramWorket = async () =>
    telegramQueue.process(1000, (job) => sendTelegramMessage(job.data.message)),
  setupUserCounterNotificationWorker = async () =>
    Promise.all([
      userCounterNotificationQueue.add(null, {
        // Daily at 07:00
        repeat: { cron: '0 7 * * *' },
      }),
      userCounterNotificationQueue.process(UserService.notifySignupCount),
    ])

export const setupWorkers = () =>
  Promise.all([
    setupEmailWorker(),
    setupTelegramWorket(),
    setupBillingWorker(),
    setupUserCounterNotificationWorker(),
  ])

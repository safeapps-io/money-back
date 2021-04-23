import Bull from 'bull'

import { redisCreds } from '@/services/redis/redisCreds'
import { ExchangeRateService } from './exchangeRate'

const exchangeRateQueue = new Bull('updating exchange rates for billing', {
  redis: redisCreds,
})

export const setupBillingWorker = async () => {
  await exchangeRateQueue.process(ExchangeRateService.updateExchangeRate)

  return exchangeRateQueue.add(null, {
    // Daily at 23:00
    repeat: { cron: '0 23 * * *' },
  })
}

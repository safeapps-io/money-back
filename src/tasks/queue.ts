import Bull from 'bull'

import { redisCreds } from '@/services/redis/redisCreds'
import { BaseEmail } from '@/services/message/types'

const props = { redis: redisCreds }

export const exchangeRateQueue = new Bull(
    'updating exchange rates for billing',
    props,
  ),
  emailQueue = new Bull<BaseEmail>('send email', props),
  telegramQueue = new Bull<{ message: string }>('send telegram message', props),
  userCounterNotificationQueue = new Bull(
    'Sending notification about sign ups',
    props,
  )

export const queues = [
  exchangeRateQueue,
  emailQueue,
  telegramQueue,
  userCounterNotificationQueue,
]

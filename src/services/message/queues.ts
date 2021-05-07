import Bull from 'bull'

import { BaseEmail } from './types'
import { redisCreds } from '@/services/redis/redisCreds'

export const emailQueue = new Bull<BaseEmail>('send email', {
    redis: redisCreds,
  }),
  telegramQueue = new Bull<string>('send telegram message', {
    redis: redisCreds,
  })

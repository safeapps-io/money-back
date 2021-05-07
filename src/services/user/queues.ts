import Bull from 'bull'

import { redisCreds } from '@/services/redis/redisCreds'
import { UserManager } from '@/models/user.model'
import { addHours } from 'date-fns'
import { MessageService } from '../message/messageService'

const userCounterNotificationQueue = new Bull(
  'Sending notification about sign ups',
  {
    redis: redisCreds,
  },
)

export const setupUserCounterNotificationWorker = async () => {
  userCounterNotificationQueue.process(async () => {
    const end = new Date(),
      start = addHours(end, -24)
    const users = await UserManager.createdBetweenDates(start, end)
    return MessageService.dailySignupStats(users.map((user) => user.username))
  })

  return userCounterNotificationQueue.add(null, {
    // Daily at 07:00
    repeat: { cron: '0 7 * * *' },
  })
}

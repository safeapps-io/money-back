import TelegramBot from 'node-telegram-bot-api'

import { telegramQueue } from './queues'

export const setupTelegramTransportWorker = async () => {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string)
  // Setting high concurrency, because that is mostly a network-heavy task,
  // no real CPU intensity here.

  return telegramQueue.process(1000, (job) =>
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID as string, job.data),
  )
}

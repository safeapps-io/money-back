import TelegramBot from 'node-telegram-bot-api'

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string)

export const sendTelegramMessage = (message: string) =>
  bot.sendMessage(process.env.TELEGRAM_CHAT_ID as string, message)

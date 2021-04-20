import { redisConnection } from '@/services/redis/connection'
import { request } from '@/services/request'

export class ExchangeRateService {
  static exchangeRateKey = 'billing:currentUsdToRubExchange'
  static async updateExchangeRate() {
    const { json } = await request<{ rates: { RUB: number } }>({
      path: `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPENFX_APP_ID}&base=USD&symbols=RUB`,
    })
    return redisConnection.set(this.exchangeRateKey, json.rates.RUB)
  }

  static fallbackValue = 76
  static async getExchangeRate() {
    const res = (await redisConnection.get(this.exchangeRateKey))!
    try {
      const parsed = parseFloat(res)
      if (Number.isNaN(parsed)) throw new Error()
      return parsed
    } catch (error) {
      console.error(error)
      return this.fallbackValue
    }
  }
}

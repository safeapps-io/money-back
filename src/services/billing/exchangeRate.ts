import { redisConnection } from '@/services/redis/connection'
import { request } from '@/services/request'
import { isNumber } from 'lodash'

type Rate = {
  rate: number
  ts: number
}

export class ExchangeRateService {
  static exchangeRateKey = 'billing:currentUsdToRubExchange'
  static async updateExchangeRate() {
    const { json } = await request<{ rates: { RUB: number } }>({
        path: `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPENFX_APP_ID}&base=USD&symbols=RUB`,
      }),
      res: Rate = {
        rate: json.rates.RUB,
        ts: new Date().getTime(),
      }

    redisConnection.set(this.exchangeRateKey, JSON.stringify(res))
  }

  static fallbackValue = 76
  static async getExchangeRate(): Promise<Rate> {
    const res = (await redisConnection.get(this.exchangeRateKey))!
    try {
      const parsed: Rate = JSON.parse(res)
      if (isNumber(parsed.rate)) return parsed
      throw new Error(`Incorrect result from exchange rate: ${res}`)
    } catch (error) {
      console.error(error)
      return { ts: 0, rate: this.fallbackValue }
    }
  }
}

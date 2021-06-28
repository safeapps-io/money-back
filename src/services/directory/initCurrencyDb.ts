import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'papaparse'
import _ from 'lodash'

export const initCurrencyDb = () => {
  const mostPopularCurrencies = ['EUR', 'USD', 'JPY', 'INR', 'GBP', 'RUB'],
    currencyToCountryDb = parse<{
      country: string
      countryCode: string
      currency: string
      currencyCode: string
    }>(readFileSync(join(__dirname, 'dataSources', 'currencyDb.csv'), 'utf-8'), {
      header: true,
    }).data

  const currencyDb = _.uniqBy(currencyToCountryDb, ({ currencyCode }) => currencyCode)
    .map((val) => ({ code: val.currencyCode, label: val.currency }))
    .sort(({ code: code1 }, { code: code2 }) => code1.localeCompare(code2))
    .sort(({ code: code1 }, { code: code2 }) => {
      if (mostPopularCurrencies.includes(code1) && !mostPopularCurrencies.includes(code2)) return -1

      if (!mostPopularCurrencies.includes(code1) && mostPopularCurrencies.includes(code2)) return 1

      return mostPopularCurrencies.indexOf(code1) - mostPopularCurrencies.indexOf(code2)
    })

  return { currencyToCountryDb, currencyDb }
}

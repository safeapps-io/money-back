import { lookup } from 'geoip-country'
import arrayMove from 'array-move'
import _ from 'lodash'

import { MetaCategoryManager } from '@/models/metaCategory.model'
import { SchemeManager } from '@/models/scheme.model'
import { serializeModel, Serializers } from '@/models/serializers'

import rawMccData from './dataSources/mccData.json'
import { initCurrencyDb } from './initCurrencyDb'

const { currencyDb, currencyToCountryDb } = initCurrencyDb()

export class DirectoryService {
  static getCurrencyList(ip: string) {
    const country = lookup(ip)?.country,
      currencyCodeForCountry = currencyToCountryDb.find(
        ({ countryCode }) => countryCode == country,
      )?.currencyCode,
      currentIndexForCurrency = _.findIndex(
        currencyDb,
        ({ code }) => code == currencyCodeForCountry,
      )

    return currentIndexForCurrency == -1
      ? currencyDb
      : arrayMove(currencyDb, currentIndexForCurrency, 0)
  }

  static mccData = new Map(
    (rawMccData as MCCInput[]).map((val) => [val.mcc, val]),
  )

  static getCodeDescription(codeList: string[]): MCCOutput {
    return codeList
      .map((code) => ({
        code,
        description: this.mccData.get(code)?.edited_description || null,
      }))
      .filter(Boolean)
  }

  static _getAllCodes() {
    return this.mccData
  }

  static async getUpdatedSchemes(fromDate: number) {
    return serializeModel(
      await SchemeManager.getUpdatedSchemes(fromDate),
      Serializers.scheme,
    )
  }

  static async getUpdatedMetaCategories(fromDate: number) {
    return serializeModel(
      await MetaCategoryManager.getUpdatedSchemes(fromDate),
      Serializers.metaCategory,
    )
  }
}

export type MCCInput = {
  mcc: string
  edited_description: string
  combined_description: string
  usda_description: string
  irs_description: string
  irs_reportable: 'Yes' | 'No'
  id: number
}
export type MCCOutput = { code: string; description: string | null }[]

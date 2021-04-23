import { MetaCategoryManager } from '@/models/metaCategory.model'
import { SchemeManager } from '@/models/scheme.model'
import { serializeModel, Serializers } from '@/models/serializers'
import currencyData from './dataSources/currencyData.json'
import rawMccData from './dataSources/mccData.json'

export class DirectoryService {
  static getCurrencyList() {
    return currencyData
  }

  static mccData = (rawMccData as MCCInput[]).reduce<{
    [code: string]: MCCInput
  }>((acc, item) => {
    acc[parseInt(item.mcc)] = item
    return acc
  }, {})

  static getCodeDescription(codeList: string[]): MCCOutput {
    return codeList
      .map((code) => ({
        code,
        description: this.mccData[code]?.edited_description,
      }))
      .filter(Boolean)
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

type MCCInput = {
  mcc: string
  edited_description: string
  combined_description: string
  usda_description: string
  irs_description: string
  irs_reportable: 'Yes' | 'No'
  id: number
}
export type MCCOutput = { code: string; description: string | null }[]

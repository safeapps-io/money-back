import { MetaCategoryManager } from '@/models/metaCategory.model'
import { SchemeManager } from '@/models/scheme.model'

export class SimpleSyncService {
  static getUpdatedSchemes(fromDate: number) {
    return SchemeManager.getUpdatedSchemes(fromDate)
  }

  static getUpdatedMetaCategories(fromDate: number) {
    return MetaCategoryManager.getUpdatedSchemes(fromDate)
  }
}

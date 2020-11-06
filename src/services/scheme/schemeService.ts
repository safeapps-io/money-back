import { SchemeManager } from '@/models/scheme.model'

export class SchemeService {
  static getUpdatedSchemes(fromDate: number) {
    return SchemeManager.getUpdatedSchemes(fromDate)
  }
}

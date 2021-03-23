import data from './data.json'

interface IMCCInput {
  mcc: string
  edited_description: string
  combined_description: string
  usda_description: string
  irs_description: string
  irs_reportable: 'Yes' | 'No'
  id: number
}

const mccData = (data as IMCCInput[]).reduce<{ [code: string]: IMCCInput }>(
  (acc, item) => {
    acc[parseInt(item.mcc)] = item
    return acc
  },
  {},
)

export class MCCService {
  static getCodeDescription(
    codeList: string[],
  ): { code: string; description: string | null }[] {
    return codeList
      .map((code) => ({
        code,
        description: mccData[code]?.edited_description,
      }))
      .filter(Boolean)
  }
}

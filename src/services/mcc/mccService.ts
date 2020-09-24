import { readFileSync } from 'fs'
import { join } from 'path'

interface IMCCInput {
  mcc: string
  edited_description: string
  combined_description: string
  usda_description: string
  irs_description: string
  irs_reportable: 'Yes' | 'No'
  id: number
}

const getMccData = () => {
  const mccFilePath = join(__dirname, 'data.json')
  const parsedData = JSON.parse(
    readFileSync(mccFilePath, { encoding: 'utf-8' }),
  ) as IMCCInput[]

  const result: {
    [id: string]: IMCCInput
  } = {}
  parsedData.forEach((item) => (result[parseInt(item.mcc)] = item))
  return result
}
const mccData = getMccData()

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

/* eslint-disable camelcase */

import { readFileSync } from 'fs'
import { join } from 'path'

export interface IMCCInput {
  mcc: string
  edited_description: string
  combined_description: string
  usda_description: string
  irs_description: string
  irs_reportable: 'Yes' | 'No'
  id: number
}

interface IReturnData {
  [id: string]: IMCCInput
}

const mccFilePath = join(__dirname, 'mccData.json')

const normalizeMCC = (): IReturnData => {
  const parsedData = JSON.parse(
    readFileSync(mccFilePath, { encoding: 'utf-8' }),
  ) as IMCCInput[]

  const result: IReturnData = {}
  parsedData.forEach(item => (result[parseInt(item.mcc)] = item))
  return result
}

const mccCodeRegistry = normalizeMCC()

export default mccCodeRegistry

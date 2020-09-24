import { WSMiddleware } from '@/utils/wsMiddleware'
import { MCCService } from './mccService'

enum ClientTypes {
  get = 'mcc/get',
}

export type MCCIncomingMessages = {
  [ClientTypes.get]: { codeList: string[] }
}

enum BackTypes {
  provide = 'mcc/provide',
}

type M = WSMiddleware<MCCIncomingMessages>
export class MCCWsMiddleware implements M {
  static [ClientTypes.get]: M[ClientTypes.get] = async ({
    wsWrapped,
    message,
  }) => {
    const items = MCCService.getCodeDescription(message.codeList)
    wsWrapped.sequentialSend({ type: BackTypes.provide, items })
  }
}

import { MCCService } from '@/services/mcc'
import { WSMiddleware } from '@/utils/wsMiddleware'

enum ITypes {
  clientMCCDescription = 'clientMCCDescription',
}

export type MCCIncomingMessages = {
  [ITypes.clientMCCDescription]: { codeList: string[] }
}

enum OTypes {
  serverMCCDescription = 'serverMCCDescription',
}

type M = WSMiddleware<MCCIncomingMessages>
export class MCCWsMiddleware implements M {
  static [ITypes.clientMCCDescription]: M[ITypes.clientMCCDescription] = async ({
    wsWrapped,
    message,
  }) => {
    const items = MCCService.getCodeDescription(message.codeList)
    wsWrapped.sequentialSend({ type: OTypes.serverMCCDescription, items })
  }
}

import { WSMiddleware } from '@/utils/wsMiddleware'
import { MCCService } from './mccService'

enum ClientTypes {
  clientMCCDescription = 'clientMCCDescription',
}

export type MCCIncomingMessages = {
  [ClientTypes.clientMCCDescription]: { codeList: string[] }
}

enum BackTypes {
  serverMCCDescription = 'serverMCCDescription',
}

type M = WSMiddleware<MCCIncomingMessages>
export class MCCWsMiddleware implements M {
  static [ClientTypes.clientMCCDescription]: M[ClientTypes.clientMCCDescription] = async ({
    wsWrapped,
    message,
  }) => {
    const items = MCCService.getCodeDescription(message.codeList)
    wsWrapped.sequentialSend({ type: BackTypes.serverMCCDescription, items })
  }
}

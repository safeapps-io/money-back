import mccCodeRegistry from '@/core/mcc/mccCodeRegistry'
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
  static [ITypes.clientMCCDescription]: M[ITypes.clientMCCDescription] = async (
    wsWrapped,
    message,
  ) => {
    const items = message.codeList
      .map(code => ({
        code,
        description: mccCodeRegistry[code]
          ? mccCodeRegistry[code].edited_description
          : null,
      }))
      .filter(Boolean) as { code: string; description: string | null }[]

    wsWrapped.sequentialSend({ type: OTypes.serverMCCDescription, items })
  }
}

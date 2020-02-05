import { MessageHandler, BackendMessageTypes } from './types'
import mccCodeRegistry from '@/core/mcc/mccCodeRegistry'

const mccCodeMessageHandler: MessageHandler = (
  ws,
  wsId,
  parsed: MccRequestData,
) => {
  const res = parsed.codeList
    .map(code =>
      mccCodeRegistry[code] ? mccCodeRegistry[code].edited_description : null,
    )
    .filter(Boolean) as string[]

  ws.sequentialSend(wsId, BackendMessageTypes.serverMCCDescription, res)
}

export default mccCodeMessageHandler

type MccRequestData = {
  codeList: string[]
}

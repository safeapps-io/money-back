import { WSMiddleware } from '@/utils/wsMiddleware'
import { SchemeService } from './schemeService'

enum ClientTypes {
  get = 'scheme/get',
}

export type SchemeIncomingMessages = {
  [ClientTypes.get]: { latestUpdated: number }
}

enum BackTypes {
  provide = 'scheme/provide',
}

type M = WSMiddleware<SchemeIncomingMessages>
export class SchemeWsMiddleware implements M {
  static [ClientTypes.get]: M[ClientTypes.get] = async ({
    wsWrapped,
    message,
  }) => {
    const items = await SchemeService.getUpdatedSchemes(message.latestUpdated)
    wsWrapped.sequentialSend({ type: BackTypes.provide, items })
  }
}

import { WSMiddleware } from '@/utils/wsMiddleware'
import { SimpleSyncService } from './simpleSyncService'

enum ClientTypes {
  getScheme = 'scheme/get',
  getMetaCategory = 'metaCategory/get',
}

type UpdateObject = { latestUpdated: number }
export type SimpleSyncIncomingMessages = {
  [ClientTypes.getMetaCategory]: UpdateObject
  [ClientTypes.getScheme]: UpdateObject
}

enum BackTypes {
  provideScheme = 'scheme/provide',
  provideMetaCategory = 'metaCategory/provide',
}

type M = WSMiddleware<SimpleSyncIncomingMessages>
export class SimpleSyncWsMiddleware implements M {
  static [ClientTypes.getScheme]: M[ClientTypes.getScheme] = async ({
    wsWrapped,
    message,
  }) => {
    const items = await SimpleSyncService.getUpdatedSchemes(
      message.latestUpdated,
    )
    wsWrapped.sequentialSend({ type: BackTypes.provideScheme, items })
  }

  static [ClientTypes.getMetaCategory]: M[ClientTypes.getMetaCategory] = async ({
    wsWrapped,
    message,
  }) => {
    const items = await SimpleSyncService.getUpdatedMetaCategories(
      message.latestUpdated,
    )
    wsWrapped.sequentialSend({ type: BackTypes.provideMetaCategory, items })
  }
}

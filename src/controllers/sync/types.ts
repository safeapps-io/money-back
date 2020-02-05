import WSSendHelper from '@/utils/wsSendWrapper'

export type ClientMessage = {
  type: ClientMessageTypes
  data: any
}

export type MessageHandler = (
  ws: WSSendHelper<BackendMessageTypes>,
  wsId: string,
  parsed: any,
) => void

export enum ClientMessageTypes {
  /** Set of updated data */
  clientChanges = 'clientChanges',
  /** Get MCC code description */
  clientMCCDescription = 'clientMCCDescription',
}

export enum BackendMessageTypes {
  /** Data about MCC code */
  serverMCCDescription = 'serverMCCDescription',
  /** Set of updated data */
  serverDataChunk = 'serverDataChunk',
  /** Sync process has been finished */
  syncFinished = 'syncFinished',
  /** Error message */
  error = 'error',
}

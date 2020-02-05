import * as wsType from 'ws'
import nanoid from 'nanoid'

import chunk from './chunk'
import { ClientMessage } from '@/controllers/sync/types'

class WSSendHelper<BackendMessagesEnum> {
  wsClients = {} as { [id: string]: wsType }

  private addNewClient(ws: wsType) {
    const id = nanoid()
    this.wsClients[id] = ws
    return id
  }

  private popClient(wsId: string) {
    delete this.wsClients[wsId]
  }

  handleConnection(
    ws: wsType,
    messageDispatcher: (id: string, data: ClientMessage) => void,
    errorHandler: (err: Error, id: string, raw: any) => void,
  ) {
    const id = this.addNewClient(ws)

    ws.on('message', raw => {
      try {
        const parsed = JSON.parse(raw as string) as ClientMessage
        messageDispatcher(id, parsed)
      } catch (err) {
        errorHandler(err, id, raw)
        ws.terminate()
      }
    })

    ws.on('close', () => this.popClient(id))
  }

  send(
    wsId: string,
    type: BackendMessagesEnum,
    data: any,
    cb?: (err?: Error) => void,
  ) {
    const sock = this.wsClients[wsId]

    if (!sock || sock.readyState !== wsType.OPEN) return

    sock.send(JSON.stringify({ data, type }), cb)
  }

  sendToAllExceptId(ignoredWsId: string, type: BackendMessagesEnum, data: any) {
    Object.keys(this.wsClients).forEach(id => {
      if (id !== ignoredWsId) this.send(id, type, data)
    })
  }

  sequentialSend(
    wsId: string,
    type: BackendMessagesEnum,
    items: Array<any>,
    finishMessage?: { type: BackendMessagesEnum; data?: any },
  ) {
    const chunkedItems = chunk(items, 100)

    const recursiveSend = (index = 0) => {
      this.send(wsId, type, chunkedItems[index], () => {
        if (chunkedItems[index + 1]) recursiveSend(index + 1)
        else
          finishMessage &&
            this.send(wsId, finishMessage.type, finishMessage.data)
      })
    }
    recursiveSend()
  }
}

export default WSSendHelper

import * as wsType from 'ws'
import nanoid from 'nanoid'

import chunk from '@/utils/chunk'

export type WSMiddleware<MessageMap> = {
  open?: (ws: any) => Promise<void>
  close?: (ws: any) => Promise<void>
  bulk?: (ws: any, message: BaseMessage, state: any) => Promise<object | void>
} & {
  [messageType in keyof MessageMap]?: (
    wsWrapped: WSWrapper,
    message: MessageMap[messageType],
    state: any,
  ) => Promise<object | void>
}

type BaseMessage = {
  token?: string
  data: any
}
type Message<MessageMap> = {
  type: keyof MessageMap
} & BaseMessage

export async function handleWsConnection<IncomingMessages>(
  ws: wsType,
  ...middlewares: WSMiddleware<IncomingMessages>[]
) {
  const id = nanoid(),
    wrapper = new WSWrapper(id, ws)

  ws.on('message', async raw => {
    const state = {}
    let type, data

    try {
      const parsed = JSON.parse(raw as string) as Message<IncomingMessages>
      type = parsed.type
      data = parsed.data
    } catch (err) {
      return ws.terminate()
    }

    for (let middleware of middlewares) {
      if (middleware.bulk) await middleware?.bulk(wrapper, data, state)
      if (!middleware[type]) continue

      try {
        await middleware[type]!(wrapper, data, state)
      } catch (error) {
        /**
         * TODO: Сделать так, чтобы определённые ошибки (например, FormValidationError) закрывали коннект с нужным кодом.
         * Например, если ты пытаешься с неверным рефреш-токеном получить новый аксес-токен.
         * Или если ты бьёшь в авторизованные места (синк), без аксес-токена.
         */
        break
      }
    }
  })

  ws.on('close', async () => {
    for (let middleware of middlewares) {
      if (!middleware.close) continue
      try {
        await middleware.close(wrapper)
      } catch (error) {
        // We want to execute all the closing fns, because we can have GC implemented there
      }
    }
  })

  wrapper.send({ type: 'start' })

  for (let middleware of middlewares) {
    if (!middleware.open) continue
    try {
      await middleware.open(wrapper)
    } catch (error) {
      break
    }
  }
}

class WSWrapper {
  constructor(public id: string, private ws: wsType) {}

  send({
    type,
    data,
    cb,
  }: {
    type: string
    data?: any
    cb?: (err?: Error) => void
  }) {
    if (this.ws.readyState !== wsType.OPEN) return

    this.ws.send(JSON.stringify({ data, type }), cb)
  }

  sequentialSend({
    type,
    items,
    finishMessage,
    threshold = 100,
  }: {
    type: string
    items: Array<any>
    finishMessage?: { type: string; data?: any }
    threshold?: number
  }) {
    const chunkedItems = chunk(items, threshold)

    const recursiveSend = (index = 0) =>
      this.send({
        type,
        data: chunkedItems[index],
        cb: () => {
          if (chunkedItems[index + 1]) recursiveSend(index + 1)
          else
            finishMessage &&
              this.send({ type: finishMessage.type, data: finishMessage.data })
        },
      })

    recursiveSend()
  }

  closeWs(code?: number, data?: object) {
    this.ws.close(code, data ? JSON.stringify(data) : undefined)
  }
}

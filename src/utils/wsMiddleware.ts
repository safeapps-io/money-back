import * as wsType from 'ws'
import { nanoid } from 'nanoid'

import chunk from '@/utils/chunk'
import { UserService } from '@/services/user/userService'
import { BillingJWTAddition } from '@/services/billing/types'

// TODO: Mama, I failed. Make this all type strict… but not like this. Too much `any`
export type WSMiddleware<MessageMap, State = {}> = {
  open?: (ws: WSWrapper<State>) => Promise<void>
  close?: (ws: WSWrapper<State>) => Promise<void>
  bulk?: (data: {
    wsWrapped: WSWrapper<State>
    message: any
    parsed: any
  }) => Promise<object | void>
} & {
  [messageType in keyof MessageMap]?: (data: {
    wsWrapped: WSWrapper<State>
    message: MessageMap[messageType]
    parsed: any
  }) => Promise<object | void>
}

type BaseMessage = {
  token?: string
  data: any
}
type Message<MessageMap> = {
  type: keyof MessageMap
} & BaseMessage

export async function handleWsConnection<IncomingMessages, State>(
  ws: wsType,
  ticket: string,
  ...middlewares: WSMiddleware<IncomingMessages, State>[]
) {
  const id = nanoid(),
    { userId, planExpirations } = await UserService.getUserDataFromWsTicket(
      ticket,
    ),
    wsWrapped = new WSWrapper<State>(id, ws, ticket, userId, planExpirations)

  ws.on('message', async (raw) => {
    let type, data, parsed
    try {
      parsed = JSON.parse(raw as string) as Message<IncomingMessages>
      type = parsed.type
      data = parsed.data
    } catch (err) {
      return ws.terminate()
    }

    for (let middleware of middlewares) {
      if (middleware.bulk)
        await middleware?.bulk({
          wsWrapped,
          message: data,
          parsed,
        })
      if (!middleware[type]) continue

      try {
        await middleware[type]!({
          wsWrapped,
          message: data,
          parsed,
        })
      } catch (error) {
        break
      }
    }
  })

  ws.on('close', async () => {
    for (let middleware of middlewares) {
      if (!middleware.close) continue
      try {
        await middleware.close(wsWrapped)
      } catch (error) {
        // We want to execute all the closing fns, because we can have GC implemented there
      }
    }
  })

  wsWrapped.send({ type: 'start' })

  for (let middleware of middlewares) {
    if (!middleware.open) continue
    try {
      await middleware.open(wsWrapped)
    } catch (error) {
      break
    }
  }
}

export class WSWrapper<State> {
  constructor(
    public id: string,
    private ws: wsType,
    public ticket: string,
    public userId: string,
    public planExpirations: BillingJWTAddition | undefined,
    public state = {} as State,
  ) {}

  private async isValidTicket() {
    try {
      const res = await UserService.getUserDataFromWsTicket(this.ticket)
      this.userId = res.userId
      this.planExpirations = res.planExpirations
      return true
    } catch (error) {
      this.closeWs()
      return false
    }
  }

  async send({
    type,
    data,
    cb,
  }: {
    type: string
    data?: any
    cb?: (err?: Error) => void
  }) {
    if (this.ws.readyState !== wsType.OPEN || !(await this.isValidTicket()))
      return

    this.ws.send(JSON.stringify({ data, type }), cb)
  }

  async sequentialSend({
    type,
    items,
    finishCallback,
    threshold = 100,
  }: {
    type: string
    items: Array<any>
    finishCallback?: () => void
    threshold?: number
  }) {
    if (this.ws.readyState !== wsType.OPEN || !(await this.isValidTicket()))
      return

    const chunkedItems = chunk(items, threshold)

    const recursiveSend = (index = 0) =>
      this.send({
        type,
        data: chunkedItems[index] || [],
        cb: () => {
          if (chunkedItems[index + 1]) recursiveSend(index + 1)
          else if (finishCallback) finishCallback()
        },
      })

    recursiveSend()
  }

  closeWs(code?: number, data?: object) {
    this.ws.close(code, data ? JSON.stringify(data) : undefined)
  }
}

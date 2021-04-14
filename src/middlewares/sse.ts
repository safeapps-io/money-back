import { Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import ash from 'express-async-handler'
import { random } from 'lodash'
import { VoidExpression } from 'typescript'

/**
 * Offers a basic boilerplate to make this endpoint SSE compatible.
 */
export const sse = (
  eventSender: (
    userId: string,
    clientId: string,
    send: SSESender,
  ) => Promise<() => Promise<void>>,
) =>
  ash(async (req: Request, res: Response, _: NextFunction) => {
    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    }
    res.writeHead(200, headers)

    const clientId = nanoid(),
      send: SSESender = (data) =>
        res.write(`data: ${JSON.stringify(data)}\nid: ${nanoid()}\n\n`)

    res.write(`retry: ${random(3000, 10000)}\n\n`)
    send({ type: 'clientId', data: clientId })

    const unsub = await eventSender(req.userId, clientId, send)

    req.on('close', () =>
      unsub!()
        .catch((e) => console.error('Error during closing SSE', e))
        .finally(() => res.end()),
    )
  })

/**
 * Parses the special header and passes it into Request object
 */
export const sseHeader = (req: Request, _: Response, next: NextFunction) => {
  const clientId = req.get('sse-clientid')
  if (clientId) req.sse = { clientId }
  next()
}

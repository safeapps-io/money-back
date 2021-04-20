import { Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import ash from 'express-async-handler'
import { random } from 'lodash'

/**
 * Offers a basic boilerplate to make this endpoint SSE compatible.
 */
export const sse = (
  senders: Array<
    (
      userId: string,
      clientId: string,
      send: SSESender,
    ) => Promise<() => Promise<void>>
  >,
) =>
  ash(async (req: Request, res: Response, _: NextFunction) => {
    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    }
    res.writeHead(200, headers)

    const send: SSESender = ({ type, data }) => {
      let dataToSend = `event: ${type}\n`
      if (typeof data !== 'undefined')
        dataToSend += `data: ${JSON.stringify(data)}\n`
      dataToSend += `id: ${nanoid()}\n\n`
      res.write(dataToSend)
    }
    res.write(`retry: ${random(3000, 10000)}\n\n`)

    const unsubs = await Promise.all(
      senders.map((sender) => sender(req.userId, req.params.clientId, send)),
    )

    req.on('close', () =>
      Promise.all(unsubs.map((unsub) => unsub()))
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

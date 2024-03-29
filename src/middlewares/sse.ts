import { nanoid } from 'nanoid'
import ash from 'express-async-handler'
import { random } from 'lodash'

/**
 * Offers a basic boilerplate to make this endpoint SSE compatible.
 */
export const sse = (
  senders: Array<
    (userId: string, clientId: string, send: SSESender) => Promise<() => Promise<void>>
  >,
) =>
  ash(async (req, res, next) => {
    const clientId = req.query.clientId
    if (!clientId || typeof clientId != 'string') return next(new Error())

    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    }
    res.writeHead(200, headers)

    const send: SSESender = ({ type, data }) => {
      let dataToSend = `event: ${type}\n`
      if (typeof data !== 'undefined') dataToSend += `data: ${JSON.stringify(data)}\n`
      dataToSend += `id: ${nanoid()}\n\n`
      res.write(dataToSend)
    }
    res.write(`retry: ${random(3000, 10000)}\n\n`)

    const unsubs = await Promise.all(senders.map((sender) => sender(req.userId, clientId, send)))

    req.on('close', () =>
      Promise.all(unsubs.map((unsub) => unsub()))
        .catch((e) => console.error('Error during closing SSE', e))
        .finally(() => res.end()),
    )
  })

/**
 * Parses the special header and passes it into Request object
 */
export const sseHeader: Handler = (req, _, next) => {
  const clientId = req.get('sse-clientid')
  if (clientId) req.sse = { clientId }
  next()
}

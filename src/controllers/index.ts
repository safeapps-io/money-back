import { Router, NextFunction, Request, Response } from 'express'
import bodyParser from 'body-parser'
import ash from 'express-async-handler'

import { RequestError } from '@/core/errors'
import auth from './auth'

const apiRouter = Router().use(bodyParser.json())

apiRouter
  .post('/auth', ash(auth))
  .use((_, res) =>
    res
      .status(404)
      .json({ error: 'No such path' })
      .end(),
  )
  .use(function(err: Error, req: Request, res: Response, next: NextFunction) {
    if (err instanceof RequestError) {
      res.status(400).json({ code: err.code, message: err.message })
      return
    }
    next(err)
  })
  // @ts-ignore
  .ws('/test', ws => {
    console.log(ws)
    // @ts-ignore
    ws.on('message', data => console.log(data))
  })

export default apiRouter

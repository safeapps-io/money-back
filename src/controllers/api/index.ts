import { Router, NextFunction, Request, Response } from 'express'
import bodyParser from 'body-parser'
import ash from 'express-async-handler'

import itWorks from './itWorks'
import { RequestError } from '@/core/errors'

const apiRouter = Router().use(bodyParser.json())

apiRouter
  .get('/itWorks', itWorks.get)
  .post('/itWorks', ash(itWorks.post))
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

export default apiRouter

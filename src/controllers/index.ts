import { Router, NextFunction, Request, Response } from 'express'
import ash from 'express-async-handler'

import { RequestError } from '@/core/errors'
import auth from './auth'

const apiRouter = Router()

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

export default apiRouter

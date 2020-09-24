import { Request, Response, NextFunction } from 'express'
import { RequestError, FormValidationError } from '@/services/errors'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  __: NextFunction,
) => {
  if (err instanceof RequestError) {
    res.status(400).json({ code: err.code, message: err.message })
  } else if (err instanceof FormValidationError) {
    res.status(400).json({
      code: err.code,
      message: err.message,
      fieldErrors: err.fieldErrors,
    })
  } else {
    console.log(err)
    req.log.error('Unknown error', err)
    res.status(500).end()
  }
}

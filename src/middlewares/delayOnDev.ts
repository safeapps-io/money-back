import { Request, Response, NextFunction } from 'express'
import delay from '@/utils/delay'

const delayOnDevMiddleware = async (_: Request, __: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') await delay(1000)
  next()
}

export default delayOnDevMiddleware

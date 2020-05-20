import { Request, Response, NextFunction } from 'express'

import {
  UserService,
  InvalidToken,
  ExpiredToken,
} from '@/services/user/userService'
import User from '@/models/user.model'
import { RequestError } from '@/core/errors'

declare global {
  namespace Express {
    interface Request {
      user: User
    }
  }
}

export const isRestAuth = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  const key = req.cookies?.key || req.headers['authorization']

  try {
    req.user = await UserService.getUserFromToken(key)
    next()
  } catch (error) {
    if (error instanceof ExpiredToken)
      next(new RequestError('Expired token', 401))
    else if (error instanceof InvalidToken)
      next(new RequestError('Invalid token', 403))
    else next(error)
  }
}

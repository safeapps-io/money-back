import { Request, Response, NextFunction } from 'express'
import * as ws from 'ws'
import { UserService, InvalidToken, ExpiredToken } from '@/services/user'
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
  let key, user
  if (req.cookies && req.cookies.key) key = req.cookies.key
  else if (req.headers['authorization']) key = req.headers['authorization']

  try {
    user = await UserService.getUserFromToken(key)
    req.user = user
  } catch (error) {
    if (error instanceof ExpiredToken)
      throw new RequestError('Expired token', 401)
    else if (error instanceof InvalidToken)
      throw new RequestError('Invalid token', 403)
    else throw error
  }

  next()
}

export const isWsAuth = async (ws: ws, req: Request, next: NextFunction) => {
  // FIXME: Temp solution, should make it better
  let key, user
  if (req.params && req.params.sessionId) key = req.params.sessionId

  try {
    user = await UserService.getUserFromToken(key as string)
    req.user = user
  } catch (error) {
    if (error instanceof ExpiredToken) ws.close()
    else if (error instanceof InvalidToken) ws.close()
    else throw error
  }
  next()
}

import { Request, Response, NextFunction } from 'express'
import { isAccessValid } from '@/models/access.model'
import * as ws from 'ws'

export const isRestAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let key
  if (req.cookies && req.cookies.key) key = req.cookies.key
  else if (req.headers['authorization']) key = req.headers['authorization']

  if (key && (await isAccessValid(key))) next()
  else res.status(403).end()
}

export const isWsAuth = async (ws: ws, req: Request, next: NextFunction) => {
  let key
  if (req.params && req.params.sessionId) key = req.params.sessionId

  if (key && (await isAccessValid(key))) next()
  else ws.close()
}

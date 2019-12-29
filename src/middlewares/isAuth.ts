import { Request, Response, NextFunction } from 'express'
import { isAccessValid } from '@/models/access.model'
import * as ws from 'ws'

const isAuth = async (cookies?: { [key: string]: string }) => {
  return cookies && cookies.key && (await isAccessValid(cookies.key))
}

export const isRestAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => ((await isAuth(req.cookies)) ? next() : res.status(403).end())

export const isWsAuth = async (ws: ws, req: Request, next: NextFunction) =>
  (await isAuth(req.cookies)) ? next() : ws.close()

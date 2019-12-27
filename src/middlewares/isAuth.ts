import { Request, Response, NextFunction } from 'express'
import { isAccessValid } from '@/models/access.model'

const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (req.cookies.key && (await isAccessValid(req.cookies.key))) {
    next()
  } else {
    res.status(403).end()
  }
}

export default isAuth

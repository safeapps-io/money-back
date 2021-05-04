import { Request, Response, NextFunction } from 'express'
import { AdminForbiddenError, AdminUnknownUser } from './isAdmin'
import { resetCookies } from '@/middlewares/isAuth'

export const adminErrorHandler = (
  err: Error,
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AdminUnknownUser || err instanceof AdminForbiddenError) {
    resetCookies(res)
    res.redirect('/auth')
  } else {
    next(err)
  }
}

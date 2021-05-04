import { Request, Response, NextFunction } from 'express'

import { getUserDataFromTokens, sendAuthCookies } from '@/middlewares/isAuth'

export class AdminUnknownUser extends Error {}
export class AdminForbiddenError extends Error {}
export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      user,
      userId,
      planExpirations,
      newToken,
    } = await getUserDataFromTokens(req, true)

    req.user = user
    req.userId = userId
    req.planExpirations = planExpirations
    if (newToken) sendAuthCookies(res, newToken)
    if (req.user?.isAdmin) {
      res.locals = { username: req.user.username }
      return next()
    } else next(new AdminForbiddenError())
  } catch (error) {
    return next(new AdminUnknownUser())
  }
}

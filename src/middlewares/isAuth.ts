import { Request, Response, NextFunction } from 'express'

import { UserService, InvalidToken } from '@/services/user/userService'
import User from '@/models/user.model'
import { RequestError } from '@/services/errors'

declare global {
  namespace Express {
    interface Request {
      user?: User
      userId: string
      tokens: { access: string; refresh: string }
    }
  }
}

enum CookieNames {
  access = 'access-token',
  refresh = 'refresh-token',
}

const secureCookieSettings = {
  maxAge: Math.pow(2, 31) - 1, // ~2038
  signed: true,
  secure: process.env.NODE_ENV == 'production',
  httpOnly: true,
  sameSite: 'strict' as 'strict',
}
export const sendAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken?: string,
) => {
  res.cookie(CookieNames.access, accessToken, secureCookieSettings)
  if (refreshToken)
    res.cookie(CookieNames.refresh, refreshToken, secureCookieSettings)
}

export const resetCookies = (res: Response) => {
  res.clearCookie(CookieNames.access).clearCookie(CookieNames.refresh)
}

/**
 * Checks if user is authorized.
 * If access token if expired, it tries to create a new one automatically out of refresh token.
 * If it is successful, it will send a new token with cookies automatically.
 */
export const isRestAuth = (fetchUser = false) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authResult = await UserService.getUserFromTokens(
      req.signedCookies[CookieNames.access],
      req.signedCookies[CookieNames.refresh],
      fetchUser,
    )

    req.user = authResult.user
    req.userId = authResult.userId
    req.tokens = {
      access: authResult.newToken || req.signedCookies[CookieNames.access],
      refresh: req.signedCookies[CookieNames.refresh],
    }
    if (authResult.newToken) sendAuthCookies(res, authResult.newToken)
    next()
  } catch (error) {
    if (error instanceof InvalidToken)
      next(new RequestError('Invalid token', 403))
    else next(error)
  }
}

export const isAdmin = (req: Request, _: Response, next: NextFunction) => {
  if (req.user?.isAdmin) next()
  else next(new RequestError('Forbidden', 401))
}

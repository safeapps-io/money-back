import { Request, Response } from 'express'

import { UserService, InvalidToken } from '@/services/user/userService'
import { RequestError } from '@/services/errors'

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
export const sendAuthCookies = (res: Response, accessToken: string, refreshToken?: string) => {
  res.cookie(CookieNames.access, accessToken, secureCookieSettings)
  if (refreshToken) res.cookie(CookieNames.refresh, refreshToken, secureCookieSettings)
}

export const getUserDataFromTokens = (req: Request, fetchUser: boolean) =>
  UserService.getUserDataFromTokens(
    req.signedCookies[CookieNames.access],
    req.signedCookies[CookieNames.refresh],
    fetchUser,
  )

export const resetCookies = (res: Response) => {
  res.clearCookie(CookieNames.access).clearCookie(CookieNames.refresh)
}

/**
 * Checks if user is authorized.
 * If access token if expired, it tries to create a new one automatically out of refresh token.
 * If it is successful, it will send a new token with cookies automatically.
 */
export const isRestAuth: (a?: boolean) => Handler =
  (fetchUser = false) =>
  async (req, res, next) => {
    try {
      const { user, userId, newToken } = await getUserDataFromTokens(req, fetchUser)

      req.user = user
      req.userId = userId
      req.tokens = {
        access: newToken || req.signedCookies[CookieNames.access],
        refresh: req.signedCookies[CookieNames.refresh],
      }
      if (newToken) sendAuthCookies(res, newToken)
      next()
    } catch (error) {
      if (error instanceof InvalidToken) next(new RequestError('Invalid token', 403))
      else next(error)
    }
  }

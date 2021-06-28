import csurf from 'csurf'
import { Router } from 'express'

import { UserService } from '@/services/user/userService'
import { getDeviceDescription } from '@/services/deviceDescription'
import { sendAuthCookies } from '@/middlewares/isAuth'

export const adminAuthRouter = Router()
  .use(csurf({ cookie: true }))
  .get('', (req, res) => res.render('auth', { csrfToken: req.csrfToken() }))
  .post('', async (req, res) => {
    // No need in rate limiting, as only selected IP addresses have access to this app
    const body = req.body as {
      usernameOrEmail: string
      password: string
    }

    const { accessToken, refreshToken, user } = await UserService.signin({
      ...body,
      description: `Admin access: ${getDeviceDescription(req.get('User-Agent') || '')}`,
    })
    sendAuthCookies(res, accessToken, refreshToken)

    if (user.isAdmin) return res.redirect('/dashboard')
    else return res.send('Forbidden')
  })

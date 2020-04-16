import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { UserService } from '@/services/user'
import { getDeviceDescription } from '@/services/deviceDescription'

const authRouter = Router()

authRouter.get('/user', isRestAuth, (req, res) => {
  res.status(200).json(req.user)
})

authRouter.post(
  '/signup',
  ash(async (req, res) => {
    const body = req.body as {
      username: string
      email?: string
      password: string
    }

    const result = await UserService.signup({
      ...body,
      description: getDeviceDescription(req.get('User-Agent') || ''),
    })

    res.json(result)
  }),
)

authRouter.post(
  '/signin',
  ash(async (req, res) => {
    const body = req.body as {
      usernameOrEmail: string
      password: string
    }

    const result = await UserService.signin({
      ...body,
      description: getDeviceDescription(req.get('User-Agent') || ''),
    })

    res.json(result)
  }),
)

authRouter.post(
  '/changePassword',
  isRestAuth,
  ash(async (req, res) => {
    const body = req.body as {
      oldPassword: string
      newPassword: string
    }
    await UserService.updatePassword({ ...body, user: req.user })

    res.status(200).end()
  }),
)

authRouter.post(
  '/newToken',
  ash(async (req, res) => {
    const body = req.body as {
      accessToken: string
      refreshToken: string
    }

    const token = await UserService.getNewAccessToken(
      body.accessToken,
      body.refreshToken,
    )
    res.json({ token })
  }),
)

export default authRouter

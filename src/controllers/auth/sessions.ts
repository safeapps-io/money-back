import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth, resetCookies } from '@/middlewares/isAuth'
import { UserService, Session } from '@/services/user/userService'
import { serializeModel, Serializers } from '@/models/serializers'

export const sessionsRouter = Router()
  .use(isRestAuth())
  .get<{}, Session[]>(
    '',
    ash(async (req, res) => {
      const sessions = await UserService.getAllSessions(req.userId, req.tokens.refresh)
      res.json(serializeModel(sessions, Serializers.session))
    }),
  )
  .delete<{}, Session[], { id: string | null }>('', async (req, res) => {
    await UserService.dropSessions({
      userId: req.userId,
      toDeleteId: req.body.id,
      currentKey: req.tokens.refresh,
    })
    const sessions = await UserService.getAllSessions(req.userId, req.tokens.refresh)
    res.json(serializeModel(sessions, Serializers.session))
  })
  .post<{}, {}, {}>(
    '/logout',
    ash(async (req, res) => {
      await UserService.logout({
        userId: req.userId,
        refreshToken: req.tokens.refresh,
      })
      resetCookies(res)

      res.json({})
    }),
  )

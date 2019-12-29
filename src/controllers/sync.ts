import { Router as WSRouter } from 'express-ws'
import { Router } from 'express'
import cookieParser from 'cookie-parser'
import { isWsAuth } from '@/middlewares/isAuth'

const syncRouter = (Router() as WSRouter).use(cookieParser())

syncRouter.ws('/sync', isWsAuth, (ws, req) => {
  console.log(req.cookies)
})

export default syncRouter

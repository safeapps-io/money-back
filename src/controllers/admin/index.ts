import { Router } from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'

import route404 from './404'

const adminRouter = Router()

adminRouter
  .use(bodyParser.urlencoded({ extended: true }))
  .use(cookieParser(process.env.SECRET))
  .use(route404)

export default adminRouter

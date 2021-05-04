import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { join } from 'path'
import { urlencoded } from 'body-parser'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import multer from 'multer'

import sequelize from '@/models/setup'
import { trackErrorsInit } from '@/services/trackErrors'
import logger from '@/middlewares/logger'
import { adminRouter } from '@/admin/controllers/router'

trackErrorsInit()

const app = express()

const constructApp = async () => {
  await sequelize.sync()

  app
    .set('trust proxy', true)
    .set('views', join(__dirname, 'views'))
    .set('view engine', 'pug')
    .use(
      logger,
      cookieParser(process.env.SECRET),
      urlencoded({ extended: true }),
      multer().none(),
      helmet(),
    )
    .use(adminRouter)

  return app
}

const scheme = process.env.ADMIN_SERVER_SCHEME as string,
  host = process.env.ADMIN_SERVER_HOST as string,
  port = parseInt(process.env.ADMIN_SERVER_PORT as string)

if (!port) throw new Error('Create .env file with PORT variable!')

const main = async () => {
  ;(await constructApp()).listen(port, host)
  console.log(`[ADMIN] Listening on ${scheme}://${host}:${port}/`)
}

main()

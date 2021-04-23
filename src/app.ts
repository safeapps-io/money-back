import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { urlencoded, json } from 'body-parser'
import cookieParser from 'cookie-parser'
import multer from 'multer'

import pathJoin from '@/utils/pathJoin'
import logger from '@/middlewares/logger'
import sequelize from '@/models/setup'
import { router } from '@/router'
import delayOnDevMiddleware from '@/middlewares/delayOnDev'
import { initRedisConnection } from '@/services/redis/connection'
import { redisPubSub } from '@/services/redis/pubSub'
import { sseHeader } from '@/middlewares/sse'

const app = express()

const constructApp = async () => {
  await sequelize.sync()
  initRedisConnection()
  redisPubSub.init()

  app
    .set('trust proxy', true)
    .set('views', pathJoin('views'))
    .set('view engine', 'pug')
    .use(
      cors({
        origin: process.env.ALLOWED_ORIGIN,
        credentials: true,
        maxAge: 86400,
        allowedHeaders: [
          'authorization',
          'accept-language',
          'content-type',
          'sse-clientid',
        ],
      }),
      logger,
      helmet(),
      cookieParser(process.env.SECRET),
      json(),
      urlencoded({ extended: true }),
      multer().none(),
      delayOnDevMiddleware,
      sseHeader,
    )
    .use('/money', router)

  return app
}

export default constructApp()

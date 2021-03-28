import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import helmet from 'helmet'
import { urlencoded, json } from 'body-parser'
import cookieParser from 'cookie-parser'
import multer from 'multer'

const { app } = expressWs(express())

import pathJoin from '@/utils/pathJoin'
import logger from '@/middlewares/logger'
import sequelize from '@/models/setup'
import { router } from '@/router'
import delayOnDevMiddleware from '@/middlewares/delayOnDev'
import { initRedisConnection } from '@/services/redis/connection'
import { redisPubSub } from '@/services/redis/pubSub'
import { billingProviderRouter, userBillingRouter } from '@/controllers/billing'

const constructApp = async () => {
  await sequelize.sync()
  initRedisConnection()
  redisPubSub.init()

  app
    .set('trust proxy', true)
    .set('views', pathJoin('views'))
    .set('view engine', 'pug')

  if (process.env.ALLOWED_ORIGIN)
    app.use(
      cors({
        origin: process.env.ALLOWED_ORIGIN,
        credentials: true,
        maxAge: 86400,
        allowedHeaders: ['authorization', 'accept-language', 'content-type'],
      }),
    )

  app
    .use(logger)
    .use(helmet())
    .use(cookieParser(process.env.SECRET))
    .use(json())
    .use(urlencoded({ extended: true }))
    .use(multer().none())
    .use(delayOnDevMiddleware)
    .use('/money', router)
    .use('/billing', userBillingRouter, billingProviderRouter)

  return app
}

export default constructApp()

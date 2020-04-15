import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import expressWs from 'express-ws'

const { app } = expressWs(express())

import cors from 'cors'
import helmet from 'helmet'

import pathJoin from '@/utils/pathJoin'
import logger from '@/middlewares/logger'
import sequelize from '@/models/setup'
import router from '@/router'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import multer from 'multer'

const constructApp = async () => {
  await sequelize.sync()

  app
    .set('x-powered-by', false)
    .set('trust proxy', true)
    .set('views', pathJoin('views'))
    .set('view engine', 'pug')

  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGIN,
      maxAge: 86400,
      allowedHeaders: ['authorization', 'content-type'],
    }),
  )

  app
    .use(logger)
    .use(helmet())
    .use(cookieParser(process.env.SECRET))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(multer().none())
    .use('/saviour', router)

  return app
}

export default constructApp()

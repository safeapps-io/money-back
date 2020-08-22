import { Sequelize } from 'sequelize-typescript'
import { join } from 'path'
import { createNamespace } from 'cls-hooked'

import config from './config/index.js'

const namespace = createNamespace('dbTransaction')
;(Sequelize as any).__proto__.useCLS(namespace)

const sequelize = new Sequelize(config[process.env.NODE_ENV as string])
sequelize.addModels([join(__dirname, '**', '*.model.ts')])

export const getTransaction = <T>(cb: () => Promise<T>) =>
  sequelize.transaction(cb)

export default sequelize

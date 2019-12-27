import { Sequelize } from 'sequelize-typescript'
import { join } from 'path'
import config from './config/index.js'

const sequelize = new Sequelize(config[process.env.NODE_ENV as string])
sequelize.addModels([join(__dirname, '**', '*.model.ts')])

export const sync = () => sequelize.sync()

export default sequelize

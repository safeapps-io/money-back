// For migration and other CLI commands
if (!process.env.DB_HOST) require('dotenv').config()

const allCommonConfig = {
    dialect: 'postgres',
    logging: false,
  },
  commonConfig = {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    ...allCommonConfig,
  }

module.exports = {
  development: commonConfig,
  production: {
    ...commonConfig,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    username: process.env.DB_USERNAME_TEST,
    password: process.env.DB_PASSWORD_TEST,
    database: process.env.DB_NAME_TEST,
    host: process.env.DB_HOST_TEST,
    port: process.env.DB_PORT_TEST,
    ...allCommonConfig,
  },
}

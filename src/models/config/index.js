module.exports = {
  development: {
    database: 'app',
    dialect: 'sqlite',
    storage: 'db.sqlite',
    logging: false,
  },
  test: {
    database: 'app',
    dialect: 'sqlite',
    storage: 'db.test.sqlite',
    logging: false,
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
  },
}

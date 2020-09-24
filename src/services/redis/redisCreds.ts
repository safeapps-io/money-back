export const redisCreds = {
  port: parseInt(process.env.REDIS_PORT as string),
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB as string),
}

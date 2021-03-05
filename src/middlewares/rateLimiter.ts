import { Request, Response, NextFunction, Router } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import ash from 'express-async-handler'
import { getRedisClient } from '@/services/redis/connection'

const client = getRedisClient({ enableOfflineQueue: true }),
  isDev = process.env.NODE_ENV == 'development'

export const createLimiter = (
  keyPrefix: string,
  {
    points,
    duration,
    blockDuration,
  }: { points: number; duration: number; blockDuration: number },
) => {
  const limiter = new RateLimiterRedis({
    storeClient: client,
    keyPrefix,
    // Making it more real to test on dev env
    points: isDev ? 2 : points,
    duration: isDev ? 60 : duration,
    blockDuration: isDev ? 60 : blockDuration,
  })

  return {
    shouldProceed: async (key: string) => {
      const res = await limiter.get(key)
      if (!res) return true
      const remainingPoints = Number.isNaN(res.remainingPoints)
        ? points
        : res.remainingPoints

      return remainingPoints > 0
    },
    consume: (key: string) => limiter.consume(key),
  }
}

export type KeyGetter = (req: Request) => string
export const ipKeyGetter: KeyGetter = (req) => req.ip

/**
 * Checks limiter right before passing it to the next middleware.
 * Has two modes of consuming: always (will always consume) and onError — if an error was raised.
 */
export const constructSimplePostRouter = ({
  handler,
  limiter,
  keyGetter = ipKeyGetter,
  consumeMode,
}: {
  handler: (req: Request, res: Response, next: NextFunction) => any
  limiter: ReturnType<typeof createLimiter>
  keyGetter?: KeyGetter
  consumeMode?: 'onError' | 'always'
}) =>
  Router()
    .use(
      ash(async (req: Request, _: Response, next: NextFunction) => {
        const key = keyGetter(req),
          res = await limiter.shouldProceed(key)

        next(res ? null : new Error())
      }),
    )
    .post(
      '',
      ash(async (req, res, next) => {
        await handler(req, res, next)
        next()
      }),
    )
    .use(
      ash(async (req) => {
        if (consumeMode == 'always') {
          const key = keyGetter(req)
          await limiter.consume(key)
        }
      }),
    )
    .use((err: Error, req: Request, _: Response, next: NextFunction) => {
      if (consumeMode == 'onError') {
        const key = keyGetter(req)
        limiter.consume(key).then(() => next(err))
      } else next(err)
    })

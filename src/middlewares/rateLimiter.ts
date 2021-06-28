import { Request, RequestHandler } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import ash from 'express-async-handler'
import { getRedisClient } from '@/services/redis/connection'

const client = getRedisClient({ enableOfflineQueue: true }),
  isDev = process.env.NODE_ENV == 'development'

export const createLimiter = (
  keyPrefix: string,
  { points, duration, blockDuration }: { points: number; duration: number; blockDuration: number },
) => {
  const limiter = new RateLimiterRedis({
    storeClient: client,
    keyPrefix,
    // Disabling on dev
    points: isDev ? 2 ^ 25 : points,
    duration: isDev ? 2 ^ 25 : duration,
    blockDuration: isDev ? 2 ^ 25 : blockDuration,
  })

  return {
    name: keyPrefix,
    shouldProceed: async (key: string) => {
      const res = await limiter.get(key)
      if (!res) return true
      const remainingPoints = Number.isNaN(res.remainingPoints) ? points : res.remainingPoints

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
export const autoInvokeRateLimiter = ({
  handler,
  limiter,
  keyGetter = ipKeyGetter,
  consumeMode,
}: {
  handler: RequestHandler
  limiter: ReturnType<typeof createLimiter>
  keyGetter?: KeyGetter
  consumeMode?: 'onError' | 'always'
}) =>
  ash(async (req, res, next) => {
    const key = keyGetter(req),
      result = await limiter.shouldProceed(key)

    // Limit is exceeded
    if (!result) return next(new Error())

    try {
      await handler(req, res, next)
    } catch (error) {
      if (consumeMode == 'onError') {
        const key = keyGetter(req)
        await limiter.consume(key)
      }
      // Forwarding the error to the error handling middleware
      return next(error)
    } finally {
      if (consumeMode == 'always') {
        const key = keyGetter(req)
        await limiter.consume(key)
      }
    }
  })

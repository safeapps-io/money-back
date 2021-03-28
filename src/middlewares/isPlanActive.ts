import { Request, Response, NextFunction } from 'express'

import { ProductType } from '@/models/billing/product.model'
import { RequestError } from '@/services/errors'

export const isPlanActive = (productType = ProductType.money) => (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  return (req.planExpirations?.[productType] || 0) > new Date().getTime()
    ? next()
    : next(new RequestError('Should have active subscription', 402))
}

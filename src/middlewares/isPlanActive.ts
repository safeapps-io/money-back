import { ProductType } from '@/models/billing/product.model'
import { RequestError } from '@/services/errors'

export const isPlanActive: (a?: ProductType) => Handler = (
  productType = ProductType.money,
) => (req, _, next) => {
  return (req.planExpirations?.[productType] || 0) > new Date().getTime()
    ? next()
    : next(new RequestError('Should have active subscription', 402))
}

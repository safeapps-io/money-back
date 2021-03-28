import User from '@/models/user.model'
import { BillingJWTAddition } from '@/services/billing/types'

declare global {
  namespace Express {
    interface Request {
      user?: User
      planExpirations?: BillingJWTAddition

      userId: string
      tokens: { access: string; refresh: string }

      rawBody?: string
    }
  }
}

export {}

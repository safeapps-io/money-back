import User from '@/models/user.model'
import { BillingJWTAddition } from '@/services/billing/types'

declare global {
  type SSESender = (data: {
    type: string
    data: Object | string | number
  }) => void

  namespace Express {
    interface Request {
      user?: User
      planExpirations?: BillingJWTAddition

      userId: string
      tokens: { access: string; refresh: string }

      rawBody?: string

      sse?: {
        clientId: string
      }
    }

    interface Response {
      sse?: {
        send: SSESender
        clientId: string
        addCloseHandler: (fn: () => Promise<void> | void) => void
      }
    }
  }
}

export {}

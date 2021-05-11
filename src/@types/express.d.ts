import User from '@/models/user.model'

declare global {
  type SSESender = (data: { type: string; data: Object | Object[] }) => void

  namespace Express {
    interface Request {
      user?: User

      userId: string
      tokens: { access: string; refresh: string }

      rawBody?: string

      sse: {
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

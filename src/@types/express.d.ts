import User from '@/models/user.model'

declare global {
  type SSESender = (data: { type: string; data: Object | Object[] }) => void
  type UserSource = { [param: string]: string } | null

  namespace Express {
    interface Request {
      user?: User

      userId: string
      userSource: UserSource
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

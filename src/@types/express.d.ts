import User from '@/models/user.model'
declare global {
  namespace Express {
    interface Request {
      user?: User
      userId: string
      tokens: { access: string; refresh: string }

      rawBody?: string
    }
  }
}

export {}

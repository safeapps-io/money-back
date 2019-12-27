import { Request, Response } from 'express'
import { RequestError } from '@/core/errors'

export default {
  get: (req: Request, res: Response) => res.json({ message: 'GET: It works!' }),
  post: async () => {
    throw new RequestError('Error text', 1000)
  },
}

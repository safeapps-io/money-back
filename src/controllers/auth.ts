import { Request, Response } from 'express'
import { delay } from 'bluebird'
import { createAccess } from '@/models/access.model'

const checkValue =
  'x2MfHTTIC3ra2jimQ/aWiNzWTNq/ntapQ1KzNeir9AeFvxY3G7xEj9bxTeoQLxZQAdAbq0kYsqWFglRCIs9p+neZZBts66dEeEvnny67HHcCIWJVAsg2aFZhGIO8IL50PZpkhbuK6Vo+I/lUKoHHOVff+kt3QfOYqFpu06f6nMsSXb7LPw0nkBVZCi5mnuH0'

export default async (req: Request, res: Response) => {
  await delay(Math.random() * 500 + 500)
  if (req.body.secret === checkValue) {
    const access = await createAccess()
    return res.status(200).json({ key: access.key })
  }
  res.status(403).end()
}

import { Request, Response } from 'express'
import { delay } from 'bluebird'
import { createAccess } from '@/models/access.model'

const checkValue =
  'x2MfHTTIC3ra2jimQ/aWiNzWTNq/ntapQ1KzNeir9AeFvxY3G7xEj9bxTeoQLxZQAdAbq0kYsqWFglRCIs9p+neZZBts66dEeEvnny67HHcCIWJVAsg2aFZhGIO8IL50PZpkhbuK6Vo+I/lUKoHHOVff+kt3QfOYqFpu06f6nMsSXb7LPw0nkBVZCi5mnuH0'

export default async (req: Request, res: Response) => {
  if (req.cookies.key) {
    if (req.body.secret === checkValue) {
      const access = await createAccess()
      return res
        .cookie('key', access.key, { expires: new Date(2100, 1) })
        .status(200)
    } else {
      await delay(1500)
      res.status(403)
    }
  }
}

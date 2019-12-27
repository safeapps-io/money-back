import { Request, Response } from 'express'

export default (req: Request, res: Response) => {
  req.log.info('404 visit')
  res.status(404).render('404')
}

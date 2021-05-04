import { Router } from 'express'

export const adminDashboardRouter = Router().get('', (_, res) =>
  res.render('dashboard'),
)

import { createBullBoard } from 'bull-board'
import { BullAdapter } from 'bull-board/bullAdapter'

import { queues } from '@/tasks/queue'
import { Router } from 'express'

const { router: bullRouter } = createBullBoard(queues.map((q) => new BullAdapter(q)))

export const adminBullRouter = Router()
  .get('/main', (_, res) => res.render('bull'))
  .use('/_bull', bullRouter)

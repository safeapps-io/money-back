import { Router } from 'express'
import csurf from 'csurf'
import ash from 'express-async-handler'

import { FeedbackManager } from '@/models/feedback.model'
import { userAdminPath, feedbackAdminPath } from '@/admin/paths'

export const adminFeedbackRouter = Router()
  .use(csurf({ cookie: true }))
  .get(
    '',
    ash(async (req, res) => {
      const q = req.query.q as string | undefined
      res.render('feedback/list', {
        feedbacks: await FeedbackManager.list(q?.trim()),
        q,
        userAdminPath,
        feedbackAdminPath,
      })
    }),
  )

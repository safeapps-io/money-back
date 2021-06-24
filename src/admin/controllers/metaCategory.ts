import csurf from 'csurf'
import { Router } from 'express'
import ash from 'express-async-handler'
import { sortBy } from 'lodash'

import { MetaCategoryManager } from '@/models/metaCategory.model'

export const adminMetaCategoryRouter = Router()
  .use(csurf({ cookie: true }))
  .get(
    '',
    ash(async (_, res) => {
      const categories = await MetaCategoryManager.list(false)
      return res.render('meta-category/list', {
        categories: sortBy(categories, [
          'isIncome',
          (cat) => !cat.published,
          'name',
        ]),
      })
    }),
  )
  .get(
    '/add',
    ash(async (req, res) =>
      res.render('meta-category/form', {
        csrfToken: req.csrfToken(),
        category: {},
      }),
    ),
  )
  .post(
    '/add',
    ash(async (req, res) => {
      await MetaCategoryManager.create(req.body)
      return res.redirect(getListPath())
    }),
  )
  .get(
    '/:id',
    ash(async (req, res) =>
      res.render('meta-category/form', {
        csrfToken: req.csrfToken(),
        category: await MetaCategoryManager.getById(req.params.id),
      }),
    ),
  )
  .post(
    '/:id',
    ash(async (req, res) => {
      await MetaCategoryManager.update(req.params.id, req.body)
      return res.redirect(getListPath())
    }),
  )
  .post(
    '/delete/:id',
    ash(async (req, res) => {
      await MetaCategoryManager.delete(req.params.id)
      return res.redirect(getListPath())
    }),
  )

function getListPath() {
  return '/meta-category'
}

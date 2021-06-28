import { Router } from 'express'
import ash from 'express-async-handler'

import { isRestAuth } from '@/middlewares/isAuth'
import { DirectoryService, MCCOutput } from '@/services/directory/directoryService'
import Scheme from '@/models/scheme.model'
import MetaCategory from '@/models/metaCategory.model'

export const directoryRouter = Router()
  .use(isRestAuth())
  .get('/currency', (req, res) =>
    res
      .set('Cache-Control', `public, max-age=${60 * 5}`)
      .json(DirectoryService.getCurrencyList(req.ip)),
  )
  .get<{}, Scheme[], {}, { from: string }>(
    '/scheme',
    ash(async (req, res) => {
      res.json(
        await DirectoryService.getUpdatedSchemes(parseInt((req.query.from as string) || '0')),
      )
    }),
  )
  .get<{}, MetaCategory[], {}, { from: string }>(
    '/meta-category',
    ash(async (req, res) => {
      res.json(
        await DirectoryService.getUpdatedMetaCategories(
          parseInt((req.query.from as string) || '0'),
        ),
      )
    }),
  )
  .post<{}, MCCOutput, { codeList: string[] }>('/mcc', (req, res) => {
    res.json(DirectoryService.getCodeDescription(req.body.codeList))
  })

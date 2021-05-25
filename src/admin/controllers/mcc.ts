import csurf from 'csurf'
import { Router } from 'express'
import ash from 'express-async-handler'

import { MetaCategoryManager } from '@/models/metaCategory.model'
import {
  DirectoryService,
  MCCInput,
} from '@/services/directory/directoryService'

const getGetData = async () => {
  const metaCategories = await MetaCategoryManager.list(),
    categories = metaCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      isIncome: cat.isIncome,
      field: cat.assignedMcc
        .map((val) => `${val.code}:${val.weight}`)
        .join('\n'),
    }))

  const assignedCodes = new Set<string>(
      metaCategories.flatMap(({ assignedMcc }) =>
        assignedMcc.map(({ code }) => code),
      ),
    ),
    mccToAssign: MCCInput[] = [],
    assignedMcc: MCCInput[] = []

  for (const mccCode of DirectoryService._getAllCodes().values()) {
    if (assignedCodes.has(mccCode.mcc)) assignedMcc.push(mccCode)
    else mccToAssign.push(mccCode)
  }

  return { categories, mccToAssign, assignedMcc }
}

export const adminMccRouter = Router()
  .use(csurf({ cookie: true }))
  .get(
    '',
    ash(async (req, res) =>
      res.render('mcc', {
        csrfToken: req.csrfToken(),
        ...(await getGetData()),
      }),
    ),
  )
  .post(
    '',
    ash(async (req, res) => {
      const { _csrf, ...toSave } = req.body as { [id: string]: string }

      const promises: Promise<any>[] = []
      for (const [id, newVal] of Object.entries(toSave)) {
        if (!newVal) {
          promises.push(MetaCategoryManager.update(id, { assignedMcc: [] }))
          continue
        }

        const cleanedValue = newVal.split('\r\n').map((val) => {
          if (val.includes(':')) {
            const [code, weight] = val.split(':')
            return { code, weight: parseInt(weight) }
          }
          return { code: val, weight: 50 }
        })
        promises.push(
          MetaCategoryManager.update(id, { assignedMcc: cleanedValue }),
        )
      }

      await Promise.all(promises)

      return res.render('mcc', {
        csrfToken: req.csrfToken(),
        ...(await getGetData()),
      })
    }),
  )

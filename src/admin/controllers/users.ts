import { Router, Request } from 'express'
import ash from 'express-async-handler'
import csurf from 'csurf'
import ms from 'ms'

import { UserManager } from '@/models/user.model'
import { differenceInMilliseconds, format, isBefore } from 'date-fns'
import { ProductManager } from '@/models/billing/product.model'
import { PlanManager } from '@/models/billing/plan.model'
import ChargeEvent, {
  ChargeEventManager,
  ChargeTypes,
  EventTypes,
} from '@/models/billing/chargeEvent.model'

const dateFormat = (date: Date | null) => {
    if (!date) return '—'

    return (
      format(date, 'dd.MM.yyyy') +
      ` (${ms(-differenceInMilliseconds(new Date(), date))})`
    )
  },
  getUserData: Handler = async (req, res) => {
    const [user, products] = await Promise.all([
      await UserManager.byIdWithAdminDataIncluded(req.params.id),
      ProductManager.all(),
    ])
    res.render('users/user', {
      csrfToken: req.csrfToken(),
      baseReqPath: req.originalUrl,
      user,
      products,
    })
  },
  getUserPath = (req: Request) => `/users/${req.params.id}`

export const adminUserRouter = Router()
  .use((_, res, next) => {
    res.locals.dateFormat = dateFormat
    res.locals.isBefore = isBefore
    return next()
  })
  .get<{}, {}, {}, { q?: string }>(
    '',
    ash(async (req, res) => {
      const { q = null } = req.query,
        [wholeCount, users] = await Promise.all([
          UserManager.count(),
          UserManager.searchByQuery(q),
        ])

      res.render('users/search', { users, wholeCount, q })
    }),
  )
  .use(csurf({ cookie: true }))
  .get('/:id', ash(getUserData))
  .post(
    '/:id/toggleIsAdmin',
    ash(async (req, res, _) => {
      const user = (await UserManager.byId(req.params.id))!
      await UserManager.update(user.id, { isAdmin: !user.isAdmin })
      return res.redirect(getUserPath(req))
    }),
  )
  .post(
    '/:id/:planId/setProduct',
    ash(async (req, res, _) => {
      const plan = (await PlanManager.byId(req.params.planId))!
      await PlanManager.update(plan.id, { productId: req.body.productId })
      return res.redirect(getUserPath(req))
    }),
  )
  .post(
    '/:id/:planId/charge/delete',
    ash(async (req, res) => {
      await ChargeEventManager.deleteByPlanAndId(
        req.body.chargeId,
        req.params.planId,
      )
      return res.redirect(getUserPath(req))
    }),
  )
  .post(
    '/:id/:planId/charge',
    ash(async (req, res, _) => {
      const expiredNew =
        (req.body.from == 'now'
          ? new Date()
          : new Date(parseInt(req.body.expiredOld))
        ).getTime() + ms(req.body.time as string)

      await Promise.all([
        PlanManager.update(req.params.planId, {
          expires: new Date(expiredNew),
        }),
        new ChargeEvent({
          eventType: EventTypes.confirmed,
          chargeType: ChargeTypes.manual,
          expiredNew,
          expiredOld: parseInt(req.body.expiredOld),
          planId: req.params.planId,
        }).save(),
      ])
      return res.redirect(getUserPath(req))
    }),
  )

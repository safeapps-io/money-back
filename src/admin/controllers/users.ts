import { Router, Request } from 'express'
import ash from 'express-async-handler'
import csurf from 'csurf'
import ms from 'ms'
import { addMilliseconds, isBefore, parse } from 'date-fns'

import { UserManager } from '@/models/user.model'
import { WalletManager } from '@/models/wallet.model'
import { EntityManager } from '@/models/entity.model'
import { ProductManager } from '@/models/billing/product.model'
import { PlanManager } from '@/models/billing/plan.model'
import ChargeEvent, {
  ChargeEventManager,
  ChargeTypes,
  EventTypes,
} from '@/models/billing/chargeEvent.model'
import * as LimitService from '@/services/billing/limitService'

const getUserPath = (req: Request) => `/users/${req.params.id}`

export const adminUserRouter = Router()
  .use((_, res, next) => {
    res.locals.isBefore = isBefore
    return next()
  })
  .get<{}, {}, {}, { q?: string; date?: string }>(
    '',
    ash(async (req, res) => {
      const { q = null, date = null } = req.query,
        [wholeCount, users] = await Promise.all([
          UserManager.count(),
          UserManager.searchByQuery({
            query: q,
            date: date ? parse(date, 'yyyy-MM-dd', new Date()) : null,
          }),
        ])

      res.render('users/search', { users, wholeCount, q, date })
    }),
  )
  .use(csurf({ cookie: true }))
  .get(
    '/:id',
    ash(async (req, res) => {
      const userId = req.params.id,
        [user, products, wallets, limit] = await Promise.all([
          UserManager.byIdWithAdminDataIncluded(userId),
          ProductManager.all(),
          WalletManager.byUserId(userId),
          LimitService.getRealLimit(),
        ]),
        entityCountByWallet = await Promise.all(
          wallets.map((w) => EntityManager.countByWalletId(w.id)),
        )

      res.render('users/user', {
        csrfToken: req.csrfToken(),
        baseReqPath: req.originalUrl,
        user,
        products,
        wallets,
        entityCountByWallet,
        limit,
      })
    }),
  )
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
      await ChargeEventManager.deleteByPlanAndId(req.body.chargeId, req.params.planId)
      return res.redirect(getUserPath(req))
    }),
  )
  .post(
    '/:id/:planId/charge',
    ash(async (req, res, _) => {
      const body = req.body as {
          expiredOld?: string
          from?: 'now' | 'prev'
          time: string
          timeInput: string
        },
        time = ms(body.timeInput || body.time)

      const expiredNew = addMilliseconds(
        body.from == 'prev' && body.expiredOld ? new Date(parseInt(body.expiredOld)) : new Date(),
        time,
      )

      await Promise.all([
        PlanManager.update(req.params.planId, {
          expires: new Date(expiredNew),
        }),
        new ChargeEvent({
          eventType: EventTypes.confirmed,
          chargeType: ChargeTypes.manual,
          expiredNew,
          expiredOld: new Date(parseInt(req.body.expiredOld)),
          planId: req.params.planId,
        }).save(),
      ])
      return res.redirect(getUserPath(req))
    }),
  )

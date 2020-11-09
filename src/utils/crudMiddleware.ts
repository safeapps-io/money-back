import { Router } from 'express'
import ash from 'express-async-handler'

export const setCrudOnRouter = <T>(manager: {
  create: (ent: T) => Promise<T>
  list: () => Promise<T[]>
  getById: (id: string) => Promise<T | null>
  update: (id: string, ent: T) => Promise<[number, T[]]>
  delete: (id: string) => Promise<number>
}) => {
  const router = Router()

  router.get(
    '',
    ash(async (_, res) => {
      res.json(await manager.list())
    }),
  )

  router.post(
    '',
    ash(async (req, res) => {
      const body = req.body as T
      res.json(await manager.create(body))
    }),
  )

  router.get(
    '/:id',
    ash(async (req, res) => {
      const { id } = req.params
      res.json(await manager.getById(id))
    }),
  )

  router.put(
    '/:id',
    ash(async (req, res) => {
      const { id } = req.params,
        body = req.body as T
      res.json(await manager.update(id, body))
    }),
  )

  router.delete(
    '/:id',
    ash(async (req, res) => {
      const { id } = req.params
      await manager.delete(id)
      res.json({})
    }),
  )

  return router
}

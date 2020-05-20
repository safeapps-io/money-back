import { Request, Response, NextFunction } from 'express'

const mockUserService = {
  getUserFromToken: jest.fn(),
}
jest.mock('@/services/user/userService', () => ({
  __esModule: true,
  UserService: mockUserService,
  ExpiredToken: class extends Error {},
  InvalidToken: class extends Error {},
}))

import { isRestAuth } from '../isAuth'
import { RequestError } from '@/core/errors'
import { ExpiredToken, InvalidToken } from '@/services/user/userService'

const _next = jest.fn(),
  next = (jest.fn() as unknown) as NextFunction & typeof _next

beforeEach(() => {
  next.mockClear()
  mockUserService.getUserFromToken.mockClear()
})

describe('isAuth middleware', () => {
  it('authorizes and sets user', async () => {
    const user = { hey: 123 }
    mockUserService.getUserFromToken.mockImplementation(async () => user)

    const req = ({ headers: { authorization: '123' } } as unknown) as Request,
      res = (null as unknown) as Response

    await isRestAuth(req, res, next)

    expect(next.mock.calls.length).toBe(1)
    expect(req.user).toEqual(user)
    expect(mockUserService.getUserFromToken.mock.calls.length).toBe(1)
  })

  it('throws if expired', async () => {
    mockUserService.getUserFromToken.mockImplementation(async () => {
      throw new ExpiredToken()
    })
    let error: any
    next.mockImplementation(err => (error = err))

    const req = ({ headers: { authorization: '' } } as unknown) as Request,
      res = (null as unknown) as Response

    await isRestAuth(req, res, next)
    expect(next.mock.calls.length).toBe(1)
    expect(error).toBeInstanceOf(RequestError)
    expect(error.code).toBe(401)
  })

  it('throws if invalid', async () => {
    mockUserService.getUserFromToken.mockImplementation(async () => {
      throw new InvalidToken()
    })
    let error: any
    next.mockImplementation(err => (error = err))

    const req = ({ headers: { authorization: '' } } as unknown) as Request,
      res = (null as unknown) as Response

    await isRestAuth(req, res, next)
    expect(next.mock.calls.length).toBe(1)
    expect(error).toBeInstanceOf(RequestError)
    expect(error.code).toBe(403)
  })
})

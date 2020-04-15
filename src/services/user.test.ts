import nanoid from 'nanoid'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'

const mockRefreshTokenManager = {
    generateToken: jest.fn().mockImplementation(data => ({
      ...data,
      id: nanoid(),
      key: nanoid(),
    })),
    tokenExists: jest.fn(),
  },
  mockUserManager = {
    createUser: jest
      .fn()
      .mockImplementation(data => ({ ...data, id: nanoid() })),
    isUsernameTaken: jest.fn(),
    isEmailTaken: jest.fn(),
    findUser: jest.fn(),
  }

jest.mock('@/models/refreshToken.model', () => ({
  __esModule: true,
  RefreshTokenManager: mockRefreshTokenManager,
}))

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))

import {
  UserService,
  CredentialsTaken,
  InvalidToken,
  TokenExpired,
} from './user'
import { FormValidationError } from '@/core/errors'

describe('User Service: sign up', () => {
  const dummyUser = {
    username: 'username',
    password: 'password',
    email: 'test@test.com',
    description: 'test',
  }

  it('signup: works', async () => {
    const res = await UserService.signup(dummyUser)

    expect(res.refreshToken).toBeDefined()
    expect(argon2.verify(res.user.password, dummyUser.password))
  })

  it('signup: forbids the same username', async () => {
    const takenUsername = 'test2'
    mockUserManager.isUsernameTaken.mockImplementation(
      async username => username === takenUsername,
    )

    try {
      await UserService.signup({
        ...dummyUser,
        username: takenUsername,
      })
      throw new Error()
    } catch (err) {
      expect(err).toBeInstanceOf(CredentialsTaken)
      expect(err.message.toLowerCase()).toContain('username')
    }
  })

  it('signup: forbids the same email', async () => {
    const takenEmail = 'test@test2.com'
    mockUserManager.isEmailTaken.mockImplementation(
      async email => email === takenEmail,
    )

    try {
      await UserService.signup({
        ...dummyUser,
        email: takenEmail,
      })
      throw new Error()
    } catch (err) {
      expect(err).toBeInstanceOf(CredentialsTaken)
      expect(err.message.toLowerCase()).toContain('email')
    }
  })

  it('signup: throws on bad username, email and password', async () => {
    try {
      await UserService.signup({
        email: 'invalid',
        username: 'smol',
        password: 'smol',
        description: '',
      })
      throw new Error()
    } catch (err) {
      expect(err).toBeInstanceOf(FormValidationError)
      expect(err.fieldErrors).toEqual({
        username: ['username must be at least 5 characters'],
        email: ['email must be a valid email'],
        password: ['password must be at least 6 characters'],
      })
    }
  })

  it('token: returns valid refresh and access tokens', async () => {
    mockRefreshTokenManager.generateToken.mockClear()
    const res = await UserService.signup(dummyUser)

    expect(mockRefreshTokenManager.generateToken.mock.calls.length).toBe(1)
    expect(UserService.getUserIdFromToken(res.token)).toBe(res.user.id)
  })

  it('token: throws for incorrect access token', () => {
    const token = jwt.sign({ data: 'test' }, 'othersecret', {
      expiresIn: '15m',
    })
    expect(() => UserService.getUserIdFromToken(token)).toThrowError(
      InvalidToken,
    )
  })

  it('token: throws for expired access token', () => {
    const token = jwt.sign({ id: 'test' }, process.env.SECRET as string, {
      expiresIn: '-1m',
    })
    expect(() => UserService.getUserIdFromToken(token)).toThrowError(
      TokenExpired,
    )
  })
})

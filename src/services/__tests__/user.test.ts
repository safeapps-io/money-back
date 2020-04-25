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
    getUserById: jest.fn(),
    changeUserPassword: jest.fn(),
    updateUser: jest
      .fn()
      .mockImplementation(async (userId: string, data: object) => ({
        ...data,
        id: userId,
      })),
  },
  mockInviteService = {
    getUserIdFromInvite: jest.fn(),
  }

jest.mock('@/models/refreshToken.model', () => ({
  __esModule: true,
  RefreshTokenManager: mockRefreshTokenManager,
}))
jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))
jest.mock('@/services/invite', () => ({
  __esModule: true,
  InviteService: mockInviteService,
}))

import {
  UserService,
  InvalidToken,
  ExpiredToken,
  InvalidRefreshToken,
  UserServiceFormErrors,
  jwtSubject,
} from '../user'
import { FormValidationError } from '@/core/errors'
import { PasswordServiceFormErrors } from '../password'

describe('User Service', () => {
  const dummyUser = {
      username: 'username',
      password: 'password',
      email: 'test@test.com',
      description: 'test',
    },
    validatedUser = {
      id: nanoid(),
      username: 'username',
      email: 'test@test.com',
    }

  describe('signup', () => {
    it('works', async () => {
      const res = await UserService.signup(dummyUser)

      expect(res.refreshToken).toBeDefined()
      expect(argon2.verify(res.user.password, dummyUser.password))
      expect(res.user.email).toBeUndefined()
    })

    it('forbids the same username', async () => {
      const takenUsername = 'test2'
      mockUserManager.isUsernameTaken.mockImplementationOnce(
        async username => username === takenUsername,
      )

      try {
        await UserService.signup({
          ...dummyUser,
          username: takenUsername,
        })
        throw new Error()
      } catch (err) {
        expect(err).toBeInstanceOf(FormValidationError)
        expect(err.message).toBe(UserServiceFormErrors.usernameTaken)
      }
    })

    it('forbids the same email', async () => {
      const takenEmail = 'test@test2.com'
      mockUserManager.isEmailTaken.mockImplementationOnce(
        async email => email === takenEmail,
      )

      try {
        await UserService.signup({
          ...dummyUser,
          email: takenEmail,
        })
        throw new Error()
      } catch (err) {
        expect(err).toBeInstanceOf(FormValidationError)
        expect(err.message).toBe(UserServiceFormErrors.emailTaken)
      }
    })

    it('throws on bad username, email and password', async () => {
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
  })

  describe('sign in', () => {
    it('works', async () => {
      const username = 'normal',
        password = 'normal',
        description = '',
        res = await UserService.signup({
          username,
          password,
          description,
        })

      mockUserManager.findUser.mockImplementationOnce(() => res.user)

      const result = await UserService.signin({
        usernameOrEmail: username,
        password,
        description,
      })
      expect(result.refreshToken).toBeDefined()
      expect(result.token).toBeDefined()
    })

    it('throws on invalid data', async () => {
      expect(UserService.signin({} as any)).rejects.toThrowError(
        FormValidationError,
      )
    })

    it('throws if no such user', async () => {
      const username = 'normal',
        password = 'normal',
        description = ''

      mockUserManager.findUser.mockImplementationOnce(() => null)

      try {
        await UserService.signin({
          usernameOrEmail: username,
          password,
          description,
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(UserServiceFormErrors.unknownUser)
      }
    })

    it('throws if incorrect password', async () => {
      const username = 'normal',
        password = 'normal',
        description = '',
        res = await UserService.signup({
          username,
          password,
          description,
        })

      mockUserManager.findUser.mockImplementationOnce(() => res.user)

      try {
        await UserService.signin({
          usernameOrEmail: username,
          password: 'incorrect',
          description,
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(PasswordServiceFormErrors.incorrectPassword)
      }
    })
  })

  describe('token', () => {
    it('returns valid refresh and access tokens', async () => {
      mockRefreshTokenManager.generateToken.mockClear()
      const res = await UserService.signup(dummyUser)

      mockUserManager.getUserById.mockImplementationOnce(id => {
        if (id === res.user.id) return res.user
      })

      expect(mockRefreshTokenManager.generateToken.mock.calls.length).toBe(1)
      const user = await UserService.getUserFromToken(res.token)
      expect(user).toEqual(res.user)
    })

    it('throws if there is no such user id', async () => {
      mockRefreshTokenManager.generateToken.mockClear()
      const res = await UserService.signup(dummyUser)

      mockUserManager.getUserById.mockImplementationOnce(id => {
        if (id === res.user.id) return null
      })

      expect(UserService.getUserFromToken(res.token)).rejects.toThrowError(
        InvalidToken,
      )
    })

    it('throws for incorrect access token', () => {
      const token = jwt.sign({ data: 'test' }, 'othersecret', {
        expiresIn: '15m',
      })
      expect(UserService.getUserFromToken(token)).rejects.toThrowError(
        InvalidToken,
      )
    })

    it('throws for expired access token', async () => {
      const token = jwt.sign({ id: 'test' }, process.env.SECRET as string, {
        expiresIn: '-1m',
        subject: jwtSubject,
      })
      try {
        await UserService.getUserFromToken(token)
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(ExpiredToken)
      }
    })

    it('getting new access token works', async () => {
      const res = await UserService.signup(dummyUser)
      mockRefreshTokenManager.tokenExists.mockImplementationOnce(
        ({ token, userId }) => {
          return userId === res.user.id && token === res.refreshToken
        },
      )

      const token = await UserService.getNewAccessToken(
        res.token,
        res.refreshToken,
      )
      expect(token).toBeTruthy()
    })

    it('getting new access token throws if invalid access-refresh pair', async () => {
      const res = await UserService.signup(dummyUser)
      mockRefreshTokenManager.tokenExists.mockImplementationOnce(() => false)

      expect(
        UserService.getNewAccessToken(res.token, res.refreshToken),
      ).rejects.toThrowError(InvalidRefreshToken)
    })

    it('throws for incorrect subject of token', async () => {
      const token = jwt.sign({ id: 'test' }, process.env.SECRET as string, {
        expiresIn: '5m',
        subject: 'other',
      })
      try {
        await UserService.getUserFromToken(token)
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidToken)
      }
    })
  })

  describe('update user', () => {
    beforeEach(() => {
      mockUserManager.updateUser.mockClear()
      mockUserManager.isUsernameTaken.mockClear()
      mockUserManager.isEmailTaken.mockClear()
    })

    it('works', async () => {
      const newUsername = 'newUsername'

      const result = await UserService.updateUser({
        user: validatedUser as any,
        username: newUsername,
        email: 'newEmail@asdfasdf.com',
      })
      expect(mockUserManager.updateUser.mock.calls.length).toBe(1)
      expect(result.email).toBeUndefined()
      expect(result.username).toBe(newUsername)
    })

    it('throws if removing email', async () => {
      try {
        await UserService.updateUser({
          user: validatedUser as any,
          username: 'newUsername',
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(UserServiceFormErrors.cantDeleteEmail)
      }
    })

    it('throws if bad email or username', async () => {
      expect(
        UserService.updateUser({
          user: {} as any,
          username: 'new',
          email: 'new',
        }),
      ).rejects.toThrowError(FormValidationError)
    })

    it('throws if taken username', async () => {
      mockUserManager.isUsernameTaken.mockImplementationOnce(async () => true)
      try {
        await UserService.updateUser({
          user: validatedUser as any,
          username: 'newUsername',
          email: validatedUser.email,
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(UserServiceFormErrors.usernameTaken)
      }

      mockUserManager.isEmailTaken.mockImplementationOnce(async () => true)
      try {
        await UserService.updateUser({
          user: {} as any,
          username: 'newUsername',
          email: 'qwer@qwer.com',
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(UserServiceFormErrors.emailTaken)
      }
    })
  })
})

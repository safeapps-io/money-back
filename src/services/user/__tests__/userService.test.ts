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
    create: jest.fn().mockImplementation(data => ({ ...data, id: nanoid() })),
    isUsernameTaken: jest.fn(),
    isEmailTaken: jest.fn(),
    findByEmailOrUsername: jest.fn(),
    byId: jest.fn(),
    changeUserPassword: jest.fn(),
    update: jest
      .fn()
      .mockImplementation(async (userId: string, data: object) => ({
        ...data,
        id: userId,
      })),
  },
  mockInviteService = {
    getUserIdFromInvite: jest.fn(),
  },
  mockUserPubSubService = {
    publishUserUpdates: jest.fn(),
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
jest.mock('@/services/user/userPubSubService', () => ({
  __esModule: true,
  UserPubSubService: mockUserPubSubService,
}))

import {
  UserService,
  InvalidToken,
  ExpiredToken,
  InvalidRefreshToken,
  UserServiceFormErrors,
  jwtSubject,
} from '../userService'
import { FormValidationError } from '@/services/errors'
import { PasswordServiceFormErrors } from '../../password'

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

      mockUserManager.findByEmailOrUsername.mockImplementationOnce(
        () => res.user,
      )

      const result = await UserService.signin({
        usernameOrEmail: username,
        password,
        description,
      })
      expect(result.refreshToken).toBeDefined()
      expect(result.accessToken).toBeDefined()
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

      mockUserManager.findByEmailOrUsername.mockImplementationOnce(() => null)

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

      mockUserManager.findByEmailOrUsername.mockImplementationOnce(
        () => res.user,
      )

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

      mockUserManager.byId.mockImplementationOnce(id => {
        if (id === res.user.id) return res.user
      })

      expect(mockRefreshTokenManager.generateToken.mock.calls.length).toBe(1)
      const user = await UserService.getUserFromToken(res.accessToken)
      expect(user).toEqual(res.user)
    })

    it('throws if there is no such user id', async () => {
      mockRefreshTokenManager.generateToken.mockClear()
      const res = await UserService.signup(dummyUser)

      mockUserManager.byId.mockImplementationOnce(id => {
        if (id === res.user.id) return null
      })

      expect(
        UserService.getUserFromToken(res.accessToken),
      ).rejects.toThrowError(InvalidToken)
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
        res.accessToken,
        res.refreshToken,
      )
      expect(token).toBeTruthy()
    })

    it('getting new access token throws if invalid access-refresh pair', async () => {
      const res = await UserService.signup(dummyUser)
      mockRefreshTokenManager.tokenExists.mockImplementationOnce(() => false)

      expect(
        UserService.getNewAccessToken(res.accessToken, res.refreshToken),
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
      mockUserManager.update.mockClear()
      mockUserManager.isUsernameTaken.mockClear()
      mockUserManager.isEmailTaken.mockClear()
      mockUserPubSubService.publishUserUpdates.mockClear()
    })

    it('works', async () => {
      const newUsername = 'newUsername'

      const result = await UserService.updateUser(validatedUser as any, {
        username: newUsername,
        email: 'newEmail@asdfasdf.com',
      })
      expect(mockUserManager.update.mock.calls.length).toBe(1)
      expect(result.email).toBeUndefined()
      expect(result.username).toBe(newUsername)
    })

    it('publishes user to redis', async () => {
      const newUsername = 'newUsername'

      await UserService.updateUser(validatedUser as any, {
        username: newUsername,
        email: 'newEmail@asdfasdf.com',
      })
      expect(mockUserPubSubService.publishUserUpdates.mock.calls.length).toBe(1)
      const {
        user: publishedUser,
      } = mockUserPubSubService.publishUserUpdates.mock.calls[0][0]
      expect(validatedUser.id).toEqual(publishedUser.id)
    })

    it('throws if removing email', async () => {
      try {
        await UserService.updateUser(validatedUser as any, {
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
        UserService.updateUser({} as any, {
          username: 'new',
          email: 'new',
        }),
      ).rejects.toThrowError(FormValidationError)
    })

    it('throws if taken username', async () => {
      mockUserManager.isUsernameTaken.mockImplementationOnce(async () => true)
      try {
        await UserService.updateUser(validatedUser as any, {
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
        await UserService.updateUser({} as any, {
          username: 'newUsername',
          email: 'qwer@qwer.com',
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(UserServiceFormErrors.emailTaken)
      }
    })

    describe('incremental user update', () => {
      beforeEach(() => {
        mockUserManager.update.mockImplementationOnce(
          async (id, mergeData) => ({ id, updated: new Date(), ...mergeData }),
        )
        mockUserPubSubService.publishUserUpdates.mockClear()
      })

      const user = { id: 'test', updated: new Date() } as any,
        encr = 'qwer',
        socketId = 'test'

      it('returns user if no client update provided, or data is stale', async () => {
        expect(
          (await UserService.incrementalUserUpdate({ user, socketId })).id,
        ).toEqual(user.id)
        expect(
          (
            await UserService.incrementalUserUpdate({
              user,
              socketId,
              data: { clientUpdated: 12341, encr },
            })
          ).id,
        ).toEqual(user.id)

        expect(mockUserManager.update.mock.calls.length).toBe(0)
      })

      it('throws if invalid data', async () => {
        try {
          await UserService.incrementalUserUpdate({
            user,
            socketId,
            data: { clientUpdated: 'wer', encr: 1234 } as any,
          })
          throw new Error()
        } catch (error) {
          expect(error).toBeInstanceOf(FormValidationError)
        }
      })

      it('updates user correctly', async () => {
        await UserService.incrementalUserUpdate({
          user,
          socketId,
          data: { clientUpdated: new Date().getTime(), encr },
        })
        expect(mockUserManager.update.mock.calls.length).toBe(1)
        const [id, data] = mockUserManager.update.mock.calls[0]
        expect(id).toBe(user.id)
        expect(data.encr).toBe(encr)
      })

      it('publishes user to redis', async () => {
        await UserService.incrementalUserUpdate({
          user,
          socketId,
          data: { clientUpdated: new Date().getTime(), encr },
        })
        expect(mockUserPubSubService.publishUserUpdates.mock.calls.length).toBe(
          1,
        )
        const {
          user: publishedUser,
        } = mockUserPubSubService.publishUserUpdates.mock.calls[0][0]
        expect(user.id).toEqual(publishedUser.id)
      })
    })

    it('updates invite key', async () => {
      const inviteKey = 'hey',
        user = {} as any

      try {
        await UserService.updateUser(user, { inviteKey: null as any })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
      }

      await UserService.updateUser(user, { inviteKey })
      expect(mockUserManager.update.mock.calls.length).toBe(1)
      expect(mockUserManager.update.mock.calls[0][1].inviteKey).toBe(inviteKey)
    })
  })
})

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
  mockUserUpdatesPubSubService = {
    publishUserUpdates: jest.fn(),
  },
  mockWalletService = {
    updateChests: jest.fn(),
  },
  mockGetTransaction = jest
    .fn()
    .mockImplementation(async (cb: () => Promise<void>) => {
      try {
        cb()
      } catch (error) {
        throw new Error()
      }
    })

jest.mock('@/models/refreshToken.model', () => ({
  __esModule: true,
  RefreshTokenManager: mockRefreshTokenManager,
  default: {},
}))
jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
  default: {},
}))
jest.mock('@/services/invite/inviteService', () => ({
  __esModule: true,
  InviteService: mockInviteService,
}))
jest.mock('@/services/user/userUpdatesPubSubService', () => ({
  __esModule: true,
  UserUpdatesPubSubService: mockUserUpdatesPubSubService,
}))
jest.mock('@/services/wallet/walletService', () => ({
  __esModule: true,
  WalletService: mockWalletService,
}))
jest.mock('@/models/setup', () => ({
  __esModule: true,
  getTransaction: mockGetTransaction,
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
import { PasswordServiceFormErrors } from '../passwordService'

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
    it('works fine', async () => {
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
    it('works fine', async () => {
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

      const r = await expect(
        UserService.signin({
          usernameOrEmail: username,
          password,
          description,
        }),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(UserServiceFormErrors.unknownUser)
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

      const r = await expect(
        UserService.signin({
          usernameOrEmail: username,
          password: 'incorrect',
          description,
        }),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(PasswordServiceFormErrors.incorrectPassword)
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
      await expect(UserService.getUserFromToken(token)).rejects.toThrow(
        ExpiredToken,
      )
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
      await expect(UserService.getUserFromToken(token)).rejects.toThrow(
        InvalidToken,
      )
    })
  })

  describe('update user', () => {
    beforeEach(() => {
      mockUserManager.update.mockClear()
      mockUserManager.isUsernameTaken.mockClear()
      mockUserManager.isEmailTaken.mockClear()
      mockUserUpdatesPubSubService.publishUserUpdates.mockClear()
    })

    describe('usual update', () => {
      it('works fine', async () => {
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
        expect(
          mockUserUpdatesPubSubService.publishUserUpdates.mock.calls.length,
        ).toBe(1)
        const {
          user: publishedUser,
        } = mockUserUpdatesPubSubService.publishUserUpdates.mock.calls[0][0]
        expect(validatedUser.id).toEqual(publishedUser.id)
      })

      it('throws if removing email', async () => {
        const r = await expect(
          UserService.updateUser(validatedUser as any, {
            username: 'newUsername',
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(UserServiceFormErrors.cantDeleteEmail)
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
        let r = await expect(
          UserService.updateUser(validatedUser as any, {
            username: 'newUsername',
            email: validatedUser.email,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(UserServiceFormErrors.usernameTaken)

        mockUserManager.isEmailTaken.mockImplementationOnce(async () => true)
        r = await expect(
          UserService.updateUser({} as any, {
            username: 'newUsername',
            email: 'qwer@qwer.com',
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(UserServiceFormErrors.emailTaken)
      })
    })

    describe('incremental user update', () => {
      beforeEach(() => {
        mockUserManager.update.mockImplementationOnce(
          async (id, mergeData) => ({ id, updated: new Date(), ...mergeData }),
        )
        mockUserUpdatesPubSubService.publishUserUpdates.mockClear()
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
        await expect(
          UserService.incrementalUserUpdate({
            user,
            socketId,
            data: { clientUpdated: 'wer', encr: 1234 } as any,
          }),
        ).rejects.toThrow(FormValidationError)
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
        expect(
          mockUserUpdatesPubSubService.publishUserUpdates.mock.calls.length,
        ).toBe(1)
        const {
          user: publishedUser,
        } = mockUserUpdatesPubSubService.publishUserUpdates.mock.calls[0][0]
        expect(user.id).toEqual(publishedUser.id)
      })
    })

    describe('master password update', () => {
      const b64InvitePublicKey = 'hey',
        b64EncryptedInvitePrivateKey = 'hey',
        user = validatedUser as any,
        chests = [] as any[]

      it('works fine', async () => {
        await UserService.updateMasterPassword({
          user,
          b64InvitePublicKey,
          b64EncryptedInvitePrivateKey,
          chests,
        })

        expect(mockGetTransaction.mock.calls.length).toBe(1)

        expect(mockUserManager.update.mock.calls.length).toBe(1)
        const [
          _userId,
          {
            b64InvitePublicKey: _b64InvitePublicKey,
            b64EncryptedInvitePrivateKey: _b64EncryptedInvitePrivateKey,
          },
        ] = mockUserManager.update.mock.calls[0]
        expect(_userId).toBe(user.id)
        expect(_b64InvitePublicKey).toBe(b64InvitePublicKey)
        expect(_b64EncryptedInvitePrivateKey).toBe(b64EncryptedInvitePrivateKey)
        expect(mockWalletService.updateChests.mock.calls.length).toBe(1)

        const {
          userId: __userId,
          chests: _chests,
        } = mockWalletService.updateChests.mock.calls[0][0]
        expect(__userId).toBe(user.id)
        expect(_chests).toEqual(chests)
      })

      it('throws if invalid string', async () => {
        await expect(
          UserService.updateMasterPassword({
            user,
            b64InvitePublicKey: null as any,
            b64EncryptedInvitePrivateKey: null as any,
            chests,
          }),
        ).rejects.toThrow(FormValidationError)
      })
    })
  })
})

const mockMessageService = {
    sendValidationEmail: jest.fn(),
  },
  mockUserManager = {
    isEmailTaken: jest.fn(),
    update: jest.fn(),
  },
  mockUserPubSubService = {
    publishUserUpdates: jest.fn(),
  }

jest.mock('@/services/message', () => ({
  __esModule: true,
  MessageService: mockMessageService,
}))
jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))
jest.mock('@/services/user/userPubSubService', () => ({
  __esModule: true,
  UserPubSubService: mockUserPubSubService,
}))

import {
  ValidateEmailService,
  ValidateEmailServiceErrors,
  jwtSubject,
} from '../validateEmailService'
import User from '@/models/user.model'
import { signJwt } from '@/utils/crypto'
import { FormValidationError } from '@/services/errors'

describe('Email validation', () => {
  const user = { id: 'test', email: 'test@test.com' } as User,
    newEmail = 'newEmail@test.com'

  beforeEach(() => {
    mockMessageService.sendValidationEmail.mockClear()
  })

  describe('trigger', () => {
    it('sends email with a correct token', async () => {
      await ValidateEmailService.triggerEmailValidation(user, newEmail)
      expect(mockMessageService.sendValidationEmail.mock.calls.length).toBe(1)

      const args = mockMessageService.sendValidationEmail.mock.calls[0][0]
      expect(args.email).toBe(newEmail)
      const { email, userId } = await ValidateEmailService.validateToken(
        args.token,
      )
      expect(email).toBe(newEmail)
      expect(userId).toBe(user.id)
    })

    it('does nothing if email is not changed or not defined', async () => {
      await ValidateEmailService.triggerEmailValidation(user, user.email!)
      await ValidateEmailService.triggerEmailValidation(user)

      expect(mockMessageService.sendValidationEmail.mock.calls.length).toBe(0)
    })

    it('throws if email is already taken', async () => {
      mockUserManager.isEmailTaken.mockImplementationOnce(async () => true)

      try {
        await ValidateEmailService.triggerEmailValidation(user, newEmail)
        throw new Error()
      } catch (err) {
        expect(err).toBeInstanceOf(FormValidationError)
        expect(err.message).toBe(ValidateEmailServiceErrors.emailTaken)
      }
    })
  })

  describe('update', () => {
    beforeEach(() => {
      mockUserPubSubService.publishUserUpdates.mockClear()
      mockUserManager.update.mockImplementation(async (_, data) => ({
        ...user,
        ...data,
      }))
    })

    it('works', async () => {
      await ValidateEmailService.triggerEmailValidation(user, newEmail)
      const { token } = mockMessageService.sendValidationEmail.mock.calls[0][0]

      await ValidateEmailService.updateEmail(token)
      const [id, { email }] = mockUserManager.update.mock.calls[0]
      expect(mockUserManager.update.mock.calls.length).toBe(1)
      expect(id).toBe(user.id)
      expect(email).toBe(newEmail)
    })

    it('publishes updates to pubsub', async () => {
      await ValidateEmailService.triggerEmailValidation(user, newEmail)
      const { token } = mockMessageService.sendValidationEmail.mock.calls[0][0]

      await ValidateEmailService.updateEmail(token)

      expect(mockUserPubSubService.publishUserUpdates.mock.calls.length).toBe(1)
      const {
        user: publishedUser,
      } = mockUserPubSubService.publishUserUpdates.mock.calls[0][0]
      expect(user.id).toEqual(publishedUser.id)
    })

    it('throws if email is taken', async () => {
      await ValidateEmailService.triggerEmailValidation(user, newEmail)
      const { token } = mockMessageService.sendValidationEmail.mock.calls[0][0]

      mockUserManager.isEmailTaken.mockImplementationOnce(async () => true)

      try {
        await ValidateEmailService.updateEmail(token)
        throw new Error()
      } catch (err) {
        expect(err).toBeInstanceOf(FormValidationError)
        expect(err.message).toBe(ValidateEmailServiceErrors.emailTaken)
      }
    })

    it('throws if token is old', async () => {
      const token = await signJwt(
        { message: 'doesnt matter' },
        { expiresIn: '-5m', subject: jwtSubject },
      )
      try {
        await ValidateEmailService.updateEmail(token)
        throw new Error()
      } catch (err) {
        expect(err).toBeInstanceOf(FormValidationError)
        expect(err.message).toBe(ValidateEmailServiceErrors.invalidToken)
      }
    })

    it('throws if subject is different', async () => {
      const token = await signJwt(
        { message: 'doesnt matter' },
        { expiresIn: '5m', subject: 'other' },
      )
      try {
        await ValidateEmailService.updateEmail(token)
        throw new Error()
      } catch (err) {
        expect(err).toBeInstanceOf(FormValidationError)
        expect(err.message).toBe(ValidateEmailServiceErrors.invalidToken)
      }
    })
  })
})

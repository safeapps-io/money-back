const mockMessageService = {
    sendValidationEmail: jest.fn(),
  },
  mockUserManager = {
    isEmailTaken: jest.fn(),
    updateUser: jest.fn(),
  }

jest.mock('@/services/message', () => ({
  __esModule: true,
  MessageService: mockMessageService,
}))
jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))

import {
  ValidateEmailService,
  ValidateEmailServiceErrors,
} from '../validateEmail'
import User from '@/models/user.model'
import { signJwt } from '@/utils/asyncJwt'
import { FormValidationError } from '@/core/errors'

describe('Email validation', () => {
  const user = { id: 'test', email: 'test@test.com' } as User,
    newEmail = 'newEmail@test.com'

  beforeEach(() => {
    mockMessageService.sendValidationEmail.mockClear()
  })

  it('trigger: sends email with a correct token', async () => {
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

  it('trigger: does nothing if email is not changed or not defined', async () => {
    await ValidateEmailService.triggerEmailValidation(user, user.email!)
    await ValidateEmailService.triggerEmailValidation(user)

    expect(mockMessageService.sendValidationEmail.mock.calls.length).toBe(0)
  })

  it('trigger: throws if email is already taken', async () => {
    mockUserManager.isEmailTaken.mockImplementationOnce(async () => true)

    try {
      await ValidateEmailService.triggerEmailValidation(user, newEmail)
      throw new Error()
    } catch (err) {
      expect(err).toBeInstanceOf(FormValidationError)
      expect(err.message).toBe(ValidateEmailServiceErrors.emailTaken)
    }
  })

  it('update: works', async () => {
    await ValidateEmailService.triggerEmailValidation(user, newEmail)
    const { token } = mockMessageService.sendValidationEmail.mock.calls[0][0]

    await ValidateEmailService.updateEmail(token)
    const [id, { email }] = mockUserManager.updateUser.mock.calls[0]
    expect(mockUserManager.updateUser.mock.calls.length).toBe(1)
    expect(id).toBe(user.id)
    expect(email).toBe(newEmail)
  })

  it('update: throws if email is taken', async () => {
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

  it('update: throws if token is old', async () => {
    const token = await signJwt(
      { message: 'doesnt matter' },
      { expiresIn: '-5m' },
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

const mockUserManager = {
    changeUserPassword: jest.fn(),
    findUser: jest.fn(),
  },
  mockMessageService = {
    sendPasswordResetEmail: jest.fn(),
  }

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))
jest.mock('@/services/message', () => ({
  __esModule: true,
  MessageService: mockMessageService,
}))

import { FormValidationError } from '@/core/errors'
import {
  PasswordService,
  PasswordServiceFormErrors,
  jwtSubject,
} from '../password'
import { signJwt } from '@/utils/asyncJwt'
import { SignOptions } from 'jsonwebtoken'

describe('Password service', () => {
  describe('change password', () => {
    const password = 'password'

    beforeEach(() => mockUserManager.changeUserPassword.mockClear())

    it('works', async () => {
      const hashedPass = await PasswordService.hashPassword(password)

      await PasswordService.updatePassword({
        user: { id: 'test', password: hashedPass } as any,
        oldPassword: password,
        newPassword: 'hey-there',
      })
      expect(mockUserManager.changeUserPassword.mock.calls.length).toBe(1)
    })

    it('throws if bad new password', async () => {
      try {
        await PasswordService.updatePassword({
          user: {} as any,
          oldPassword: '',
          newPassword: 'hey',
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
      }
    })

    it('throws if invalid old password', async () => {
      try {
        await PasswordService.updatePassword({
          user: {} as any,
          oldPassword: 'incorrect password',
          newPassword: 'hey-there',
        })
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(PasswordServiceFormErrors.incorrectPassword)
      }
    })
  })

  describe('reset password', () => {
    const email = 'test@email.com',
      id = '1'
    beforeEach(() => {
      mockMessageService.sendPasswordResetEmail.mockClear()
      mockUserManager.changeUserPassword.mockClear()
    })

    it('sends reset email with valid token', async () => {
      mockUserManager.findUser.mockImplementationOnce(async findEmail => {
        if (findEmail === email) return { id, email }
      })

      await PasswordService.requestPasswordReset(email)

      const {
        email: sendEmailAddress,
        token,
      } = mockMessageService.sendPasswordResetEmail.mock.calls[0][0]
      const parsedId = await PasswordService.getUserIdFromPasswordResetToken(
        token,
      )

      expect(mockMessageService.sendPasswordResetEmail.mock.calls.length).toBe(
        1,
      )
      expect(sendEmailAddress).toBe(email)
      expect(parsedId).toBe(id)
    })

    it('throws if user has no email', async () => {
      mockUserManager.findUser.mockImplementationOnce(async findEmail => {
        if (findEmail === email) return { id }
      })
      try {
        await PasswordService.requestPasswordReset(email)
        throw new Error()
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
        expect(error.message).toBe(PasswordServiceFormErrors.resetNoEmail)
      }
    })

    it('throws if invalid token/subject/expired token', async () => {
      const runCheck = async (options: SignOptions) => {
        try {
          const token = await signJwt({ id: 'test' }, options)
          await PasswordService.getUserIdFromPasswordResetToken(token)
          throw new Error()
        } catch (error) {
          expect(error).toBeInstanceOf(FormValidationError)
          expect(error.message).toBe(
            PasswordServiceFormErrors.resetInvalidToken,
          )
        }
      }
      await runCheck({ subject: 'wrong' })
      await runCheck({ subject: jwtSubject, expiresIn: '-5m' })
    })

    it('updates password', async () => {
      mockUserManager.findUser.mockImplementationOnce(async findEmail => {
        if (findEmail === email) return { id, email }
      })

      await PasswordService.requestPasswordReset(email)
      const {
        token,
      } = mockMessageService.sendPasswordResetEmail.mock.calls[0][0]

      await PasswordService.updatePasswordFromResetToken({
        token: token,
        password: 'normalPassword',
      })

      expect(mockUserManager.changeUserPassword.mock.calls.length).toBe(1)
    })

    it('throws if bad password', async () => {
      try {
        await PasswordService.updatePasswordFromResetToken({
          token: '',
          password: 'smol',
        })
      } catch (error) {
        expect(error).toBeInstanceOf(FormValidationError)
      }
    })
  })
})

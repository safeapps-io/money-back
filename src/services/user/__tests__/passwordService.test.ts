const mockUserManager = {
    changePassword: jest.fn(),
    findByEmailOrUsername: jest.fn(),
  },
  mockMessageService = {
    sendPasswordResetEmail: jest.fn(),
  }

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))
jest.mock('@/services/message/messageService', () => ({
  __esModule: true,
  MessageService: mockMessageService,
}))

import { FormValidationError } from '@/services/errors'
import {
  PasswordService,
  PasswordServiceFormErrors,
  jwtSubject,
} from '../passwordService'
import { signJwt } from '@/utils/crypto'
import { SignOptions } from 'jsonwebtoken'

describe('Password service', () => {
  describe('change password', () => {
    const password = 'password'

    beforeEach(() => mockUserManager.changePassword.mockClear())

    it('works fine', async () => {
      const hashedPass = await PasswordService.hashPassword(password)

      await PasswordService.updatePassword({
        user: { id: 'test', password: hashedPass } as any,
        oldPassword: password,
        newPassword: 'hey-there',
      })
      expect(mockUserManager.changePassword.mock.calls.length).toBe(1)
    })

    it('throws if bad new password', async () => {
      await expect(
        PasswordService.updatePassword({
          user: {} as any,
          oldPassword: '',
          newPassword: 'hey',
        }),
      ).rejects.toThrow(FormValidationError)
    })

    it('throws if invalid old password', async () => {
      const r = await expect(
        PasswordService.updatePassword({
          user: {
            password: await PasswordService.hashPassword('pass', false),
          } as any,
          oldPassword: 'incorrect password',
          newPassword: 'hey-there',
        }),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(PasswordServiceFormErrors.incorrectPassword)
    })
  })

  describe('reset password', () => {
    const email = 'test@email.com',
      id = '1'
    beforeEach(() => {
      mockMessageService.sendPasswordResetEmail.mockClear()
      mockUserManager.changePassword.mockClear()
    })

    it('sends reset email with valid token', async () => {
      mockUserManager.findByEmailOrUsername.mockImplementationOnce(
        async (findEmail) => {
          if (findEmail === email) return { id, email }
        },
      )

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
      mockUserManager.findByEmailOrUsername.mockImplementationOnce(
        async (findEmail) => {
          if (findEmail === email) return { id }
        },
      )
      const r = await expect(PasswordService.requestPasswordReset(email))
        .rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(PasswordServiceFormErrors.resetNoEmail)
    })

    it('throws if invalid token/subject/expired token', async () => {
      const runCheck = async (options: SignOptions) => {
        const token = await signJwt({ id: 'test' }, options)
        const r = await expect(
          PasswordService.getUserIdFromPasswordResetToken(token),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(PasswordServiceFormErrors.resetInvalidToken)
      }
      await runCheck({ subject: 'wrong' })
      await runCheck({ subject: jwtSubject, expiresIn: '-5m' })
    })

    it('updates password', async () => {
      mockUserManager.findByEmailOrUsername.mockImplementationOnce(
        async (findEmail) => {
          if (findEmail === email) return { id, email }
        },
      )

      await PasswordService.requestPasswordReset(email)
      const {
          token,
        } = mockMessageService.sendPasswordResetEmail.mock.calls[0][0],
        password = 'normalPassword'

      await PasswordService.updatePasswordFromResetToken({
        token,
        password,
      })

      expect(mockUserManager.changePassword.mock.calls.length).toBe(1)
      const hashedPassword = mockUserManager.changePassword.mock.calls[0][1]
      expect(await PasswordService.verifyPassword(hashedPassword, password))
    })

    it('throws if bad password', async () => {
      await expect(
        PasswordService.updatePasswordFromResetToken({
          token: '',
          password: 'smol',
        }),
      ).rejects.toThrow(FormValidationError)
    })
  })
})
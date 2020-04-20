const mockUserManager = {
  changeUserPassword: jest.fn(),
}

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))

import { FormValidationError } from '@/core/errors'
import { PasswordService, PasswordServiceFormErrors } from '../password'

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
})

import { clearMocks } from '@/utils/jestHelpers'
import testData from '@/services/crypto/testData.json'
import { FormValidationError } from '@/services/errors'
import { InviteServiceFormErrors, InviteStringTypes } from '../inviteTypes'

const mockUserManager = {
  byId: jest.fn(),
}

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))

import { InviteStringService } from '../inviteStringService'

describe('Invite String Service', () => {
  // The corresponding private key is in the same file
  const b64InvitePublicKey = testData.users.dkzlv.b64InvitePublicKey,
    userInviterId = 'ownerId',
    b64ServiceInvite = testData.users.dkzlv.signedInvite,
    b64WalletInvite =
      'eyJpbnZpdGVJZCI6InN2eUl5THNYalhfcG1wSEhrX1lYWiIsIndhbGxldElkIjoiVW1PTjlROUpfMkJhWTRKUU1kTngwIiwidXNlckludml0ZXJJZCI6Im93bmVySWQifQ==___mItbTCiAuq2KHDLGpbeQTFk1OGU7Ubc1NuVVlYk2u7hLH9+O46ackUmExnqULbFEqiO/IohLU2+Fr3ez3Gm9REjJWcjxFmU+6vmGBKPFWCKfd4uMYvuBxrWpYTqXMNHLUKNhWkWnkP1fcZs3ZZUlS7gUVJID+aQNCyCflaEzZwdSb3LQvxE6wXpt8JofLjQW2iPAMVMZiHuchDiVatFr8FmsmtaQrxljuN1PjJXwyfab0coMmHyltjS8M4FnxPo9UTQdjJrJ0WHQfod3ui8l4wVPhfjStPcs0Ug3t2GSlUNO/Rez9j+zMim+gRrPwrKxRpW2368sZgb3cZpA1ssZ2Q=='

  beforeEach(() => {
    clearMocks(mockUserManager)

    mockUserManager.byId.mockImplementation(async () => ({
      id: userInviterId,
      b64InvitePublicKey,
    }))
  })

  describe('prelaunch', () => {
    it('works ok', async () => {
      const userId = 'qwerty',
        validInvite = InviteStringService.generatePrelaunchInvite(userId)

      const result = await InviteStringService.parseAndVerifySignature(
        validInvite,
      )
      expect(result.type).toBe(InviteStringTypes.prelaunch)
      expect((result.payload as any).userInviterId).toBe(userId)
    })
  })

  describe('service and wallet', () => {
    it('service invite: works ok', async () => {
      const result = await InviteStringService.parseAndVerifySignature(
        b64ServiceInvite,
      )
      expect(result.type).toBe(InviteStringTypes.service)
      expect(result.payload).toEqual({
        inviteId: 'NRhATmZbAYZ2O1jMlE0pB',
        userInviterId,
      })
    })

    it('wallet invite: works ok', async () => {
      const result = await InviteStringService.parseAndVerifySignature(
        b64WalletInvite,
      )
      expect(result.type).toBe(InviteStringTypes.wallet)
      expect(result.payload).toEqual({
        userInviterId,
        inviteId: 'svyIyLsXjX_pmpHHk_YXZ',
        walletId: 'UmON9Q9J_2BaY4JQMdNx0',
      })
    })

    it('throws if invalid data', async () => {
      const r = expect(InviteStringService.parseAndVerifySignature(null as any))
        .rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)
    })

    it('throws if invalid invite string (not JSON, no signature)', async () => {
      let r: any

      r = expect(
        InviteStringService.parseAndVerifySignature(
          b64ServiceInvite.split('___').join('_'),
        ),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)

      // it has `null` encoded as b64 object
      const fakeInvite =
        'bnVsbA==___C9eHo6lj6S3Fup9anWVpdyY5ThqfrLb0ldH70P3KM+MDemPifkNMc+maPlXzjHVXbC52pLaWimpdrZcyomTvc/3IdD5YS5ZGM+5W41+JlW31+MxNGOPwdvkBLmkA0AscZozrJD1fb8f1pui+AzhfLI5w92w1ai1F+EOw12yi8aVzAHp1VJqxTyp4lSQuwTR3RBjzjZX4c0zYKN32+dx8Y5BxZ7/MG6zBedNmPjYZiTU5X9it12T1FvVFJQeHmM0P0FkD930nPc4uhvfuQnSNYYnU3JCiwZXh/qoBy9R8b+/V1S5HpU8nyEYgEKERrnXmKeJYEG7ZVixkpzB/3uoTJg=='
      r = expect(InviteStringService.parseAndVerifySignature(fakeInvite))
        .rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)
    })

    it('throws if user is not found', async () => {
      mockUserManager.byId.mockImplementationOnce(async () => null)
      const r = expect(
        InviteStringService.parseAndVerifySignature(b64ServiceInvite),
      ).rejects

      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)
    })
  })
})

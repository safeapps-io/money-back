import { clearMocks } from '@/utils/jestHelpers'
import testData from '@/services/crypto/testData.json'
import { FormValidationError } from '@/services/errors'
import { InviteServiceFormErrors, InviteStringTypes } from '../inviteTypes'
import { encryptAes } from '@/utils/crypto'

const mockUserManager = {
  byId: jest.fn(),
}

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))

import { InviteStringService } from '../inviteStringService'

describe('Invite String Service', () => {
  const walletId = '098765',
    inviteId = '123456',
    // The corresponding private key is in the same file
    b64InvitePublicKey = testData.users.dkzlv.b64InvitePublicKey,
    userInviterId = 'ownerId',
    b64ServiceInvite = testData.users.dkzlv.signedInvite,
    walletUserInviterId = 'qwerty123456',
    b64WalletInvite =
      'eyJpbnZpdGVJZCI6IjEyMzQ1NiIsIndhbGxldElkIjoiMDk4NzY1IiwidXNlckludml0ZXJJZCI6InF3ZXJ0eTEyMzQ1NiJ9___hhIfPtaBvkAAnLB0MLut3L0k+BMWUiS3LxFDOmsJrxP9jUmUIoe0viaM5J1RfJTZZk6i28EyEIXh2fePK/siWmujSgxGQNUpAkd2W8NQd7B068xUmUfYO9d2nu9hVKR5U1UhVhVWZYayl2IAOi2rdxEUs92vXd1MWhoibqoxrpaXkEbdGT9NyIbvD+E8pCEFII2Q0hHaxFOU3Zl5T9LH6PvyamghjCjP+oCQOIqPIRc61COX0efE3IdA2wYKKucjNMSOux8jaE1JEQlfQ5uIX5d1HqtLL2R1snwkMyhwtUzluIXTIk5QjshyhhZL8vEVThi0Qzvhv+dF/1Z0Gm40LQ=='

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
        userInviterId,
        inviteId,
      })
    })

    it('wallet invite: works ok', async () => {
      const result = await InviteStringService.parseAndVerifySignature(
        b64WalletInvite,
      )
      expect(result.type).toBe(InviteStringTypes.wallet)
      expect(result.payload).toEqual({
        userInviterId: walletUserInviterId,
        inviteId,
        walletId,
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

import { clearMocks } from '@/utils/jestHelpers'

const mockUserManager = {
    byId: jest.fn(),
    countInvitedBetweenDates: jest.fn(),
  },
  mockWalletManager = {
    byId: jest.fn(),
    addRejectedInvite: jest.fn(),
    addUser: jest.fn(),
    removeUserByWaId: jest.fn(),
    removeWithJoiningError: jest.fn(),
  },
  mockInvitePubSubService = {
    requestToOwner: jest.fn(),
    invitationError: jest.fn(),
    invitationReject: jest.fn(),
    invitationAccept: jest.fn(),
    joiningError: jest.fn(),
  },
  mockWalletPubSubService = {
    publishWalletUpdates: jest.fn(),
  }

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))
jest.mock('@/models/wallet.model', () => ({
  __esModule: true,
  WalletManager: mockWalletManager,
}))
jest.mock('@/services/invite/invitePubSubService', () => ({
  __esModule: true,
  InvitePubSubService: mockInvitePubSubService,
}))
jest.mock('@/services/wallet/walletPubSubService', () => ({
  __esModule: true,
  WalletPubSubService: mockWalletPubSubService,
}))

import { InviteService, InviteServiceFormErrors } from '../inviteService'
import { FormValidationError } from '@/services/errors'
import { AccessLevels } from '@/models/walletAccess.model'
import testData from '@/services/crypto/testData.json'

describe('Invite service', () => {
  beforeEach(() => {
    clearMocks(mockUserManager)
    clearMocks(mockWalletManager)
    clearMocks(mockInvitePubSubService)
    clearMocks(mockWalletPubSubService)

    mockUserManager.byId.mockImplementation(async (id: string) => ({
      id,
      b64InvitePublicKey,
    }))
    mockUserManager.countInvitedBetweenDates.mockImplementation(async () => 0)
    mockWalletManager.byId.mockImplementation(async () => ({
      id: walletId,
      users: [
        {
          ...walletOwner,
          WalletAccess: { accessLevel: AccessLevels.owner },
        },
      ],
    }))
    mockInvitePubSubService.requestToOwner.mockImplementation(async () => 1)
  })

  const walletId = '098765',
    ownerId = 'ownerId',
    joiningUserId = 'joiningId',
    // For generating other signatures I saved private key there
    b64InvitePublicKey = testData.users.dkzlv.b64InvitePublicKey,
    b64PublicECDHKey = 'nonce',
    encryptedSecretKey = 'nonce',
    inviteId = '123456',
    b64GenericInvite = testData.users.dkzlv.signedInvite,
    b64InviteString =
      'eyJpbnZpdGVJZCI6IjEyMzQ1NiIsIndhbGxldElkIjoiMDk4NzY1IiwidXNlckludml0ZXJJZCI6Im93bmVySWQifQ==___d/6RXZRQLqpuAeZLfDqlh274dVm+PfLK4WEZv9MVQleUCmhNsKLJnHcm0UF0XMIFVrFHaBzEETQsZyebPfGDeGS1oZ2usVp7OMaE665wV0R+BxXiDKrkALNfadWumS6h8UanHGbxRa6i8ZnihY6ucY32UXKiuRkwRMKtQVZ7wvT8LH4ap5oURcNDSreULvLrBElnf5DbYMFgv17SHoLBHnO9VaUBrz028AKSs/ABfQMRLG78SNcy+kOW5teRiI4boGyCId6vCFjQbq7z0lWVgAky0+RtVfptCyJVAUxdNT5m7l2tvtHb6vsOLCfHUlWl8Nzw1mPB1zEhxJtT2QHCiw==',
    b64InviteSignatureByJoiningUser =
      'AGXuLUwapcFc/idZrNeppIHKFMDq9cTixZLSU6dsLGXqPsSUg2mPwh2qQdMmQgDl2+lh58QzQyyTYLbkqguCLfBGtTIdBfnEzy9gQ3Qx/qA6bL0a6mkZK07gwB5R6WyGVM820T9wpnLOMpbXWzwWg4OH8tQwooHpeMOoRnLot+8ed4lVCPThB2Pb/bPgdboGmPN3TSZyndzPtm6Yfy0lhxcrK4bGfwXxIisjM8MUL9r+H2xd65JHqEaGruK/GqE7LIg6eAv6sXyFslR9Lx78I37hL92/o+ENV2ZXqf6cclu25os7MErFFPJRh06lSZlc0rDnzGec8nasPKoCeOGBYQ==',
    walletOwner = {
      id: ownerId,
      username: 'owner',
      b64InvitePublicKey,
    } as any,
    joiningUser = {
      id: joiningUserId,
      username: 'joiningUser',
      // Using the same key for simplicity
      b64InvitePublicKey,
    } as any

  describe('generic invites', () => {
    it('works', async () => {
      const res = await InviteService.parseAndValidateInvite(b64GenericInvite)
      expect(res.decodedInvite.userInviterId).toBe(ownerId)
    })

    it('fails if user has invited enough users', async () => {
      mockUserManager.countInvitedBetweenDates.mockImplementationOnce(
        async () => 10,
      )
      const r = await expect(
        InviteService.parseAndValidateInvite(b64GenericInvite),
      ).rejects

      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.limitReached)
    })

    it('throws if invalid data', async () => {
      await expect(
        InviteService.parseAndValidateInvite(null as any),
      ).rejects.toThrowError(Error)
    })

    it('throws if invalid invite string (not JSON, no signature)', async () => {
      let r: any

      r = await expect(
        InviteService.parseAndValidateInvite(
          b64InviteString.split('___').join('_'),
        ),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)

      // it has `null` encoded as b64 object
      const fakeInvite =
        'bnVsbA==___C9eHo6lj6S3Fup9anWVpdyY5ThqfrLb0ldH70P3KM+MDemPifkNMc+maPlXzjHVXbC52pLaWimpdrZcyomTvc/3IdD5YS5ZGM+5W41+JlW31+MxNGOPwdvkBLmkA0AscZozrJD1fb8f1pui+AzhfLI5w92w1ai1F+EOw12yi8aVzAHp1VJqxTyp4lSQuwTR3RBjzjZX4c0zYKN32+dx8Y5BxZ7/MG6zBedNmPjYZiTU5X9it12T1FvVFJQeHmM0P0FkD930nPc4uhvfuQnSNYYnU3JCiwZXh/qoBy9R8b+/V1S5HpU8nyEYgEKERrnXmKeJYEG7ZVixkpzB/3uoTJg=='
      r = await expect(InviteService.parseAndValidateInvite(fakeInvite)).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)
    })
  })

  describe('wallet invites', () => {
    describe('validate wallet invite', () => {
      it('works ok', async () => {
        await InviteService.launchWalletJoin({
          joiningUser,
          b64InviteString,
          b64InviteSignatureByJoiningUser,
          b64PublicECDHKey,
        })
        expect(mockInvitePubSubService.requestToOwner.mock.calls.length).toBe(1)
        expect(
          mockInvitePubSubService.requestToOwner.mock.calls[0][0].walletOwner
            .id,
        ).toBe(walletOwner.id)
      })

      it('throws if no such wallet', async () => {
        mockWalletManager.byId.mockImplementationOnce(async () => null)
        const r = await expect(
          InviteService.launchWalletJoin({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })

      it('throws if user is already a member', async () => {
        const res = await mockWalletManager.byId(walletId)
        mockWalletManager.byId.mockImplementationOnce(async () => {
          return {
            ...res,
            users: [...res.users, { id: joiningUserId }],
          }
        })

        const r = await expect(
          InviteService.launchWalletJoin({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.alreadyMember)
      })

      it('throws if invite has already been used', async () => {
        const res = await mockWalletManager.byId(walletId)
        res.users[0].WalletAccess.inviteId = inviteId
        mockWalletManager.byId.mockImplementationOnce(async () => res)

        const r = await expect(
          InviteService.launchWalletJoin({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.inviteAlreadyUsed)
      })

      it('throws if signature is not verified', async () => {
        // Correct invite string, but signed with some other key
        const newInviteString =
          'eyJpbnZpdGVJZCI6IjEyMzQ1NiIsIndhbGxldElkIjoiMDk4NzY1In0=___F5kPw+3Qg2VNYNtws+3MX3k8uCi7c9LDKOucE6OIMbkXsiEqXeGxMPzZl/qZekQ69BqEH4LeaDsh78XZzG3WJqSIRerPd+QT722vru7ZMBhfwgbaLfleGfu4CIw4xMMwqH+mLZ6qMUuY9e7rmXEaLQwNh4nnm1BWBzJTPisnM6EJob+8jEMLLKhPMIogbRainyVDO4qsE4zlcRlB65eiQRmE4eiDkfC0JeF1aJnL7FXyMq62pb2yvRMS62R831Vh5lAlTjgOPax0R+mid4HfqGpjgUNRO6heLphovebY2zy5pSiLRCIsN/hhei2wR98iJ6cArs+QG6XB+iwEBoBgtw=='

        const r = await expect(
          InviteService.launchWalletJoin({
            joiningUser,
            b64InviteString: newInviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })

      it('throws if owner is offline', async () => {
        mockInvitePubSubService.requestToOwner.mockImplementationOnce(
          async () => 0,
        )

        const r = await expect(
          InviteService.launchWalletJoin({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.ownerOffline)
      })
    })

    describe('invitation error', () => {
      // Here we check owner invitation message once and for all
      beforeEach(() => {
        mockUserManager.byId.mockImplementation(async () => joiningUser)
      })

      it('works ok', async () => {
        await InviteService.invitationError({
          walletOwner,
          joiningUserId,
          b64InviteSignatureByJoiningUser,
          b64InviteString,
        })
        const c = mockInvitePubSubService.invitationError.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].joiningUser.id).toBe(joiningUserId)
        expect(c[0][0].walletId).toBe(walletId)
      })

      it('throws if invalid joining user id, signature or invite string', async () => {
        return expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId: null as any,
            b64InviteSignatureByJoiningUser: null as any,
            b64InviteString: null as any,
          }),
        ).rejects.toThrow(FormValidationError)
      })

      it('throws if no wallet, joining user found, or joining user has no public key', async () => {
        mockWalletManager.byId.mockImplementationOnce(async () => null)
        let r: any

        r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)

        mockUserManager.byId.mockImplementationOnce(async () => null)

        r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if wallet has no owner', async () => {
        const res = await mockWalletManager.byId()
        res.users[0].WalletAccess.accessLevel = 'no'
        mockWalletManager.byId.mockImplementationOnce(async () => res)

        const r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if joining user signature is invalid', async () => {
        // Signed with some other key
        const invalidJoiningSignature =
          'XvbQacRt+FBt1GZvOy90nFQ/vgeYAucIYlOOd5kjIJxGErZwAMGH5YTRUXpgG6DOKUHl2KrCPsV4nCq0/GV/EvClC2h4bAkySu5sVAOKP5B+GngJUgKcm0CvCW2XqdqjS8zBRfA06wYI1oM51+XDtGpVFGfCGucPRUdDVQRsbK1UA4mlG/7aYNfsiqeDEViAPdJLt5GbRbQtNzRn9sGDSnpT1tlxO9iW/NbGS/z3oDokn9MR6AOhVuCN3Ni3FtWgyAr4ScRPEtmblIpOsvW5x3UZZUF5Sj2xjb4HeALFD7v4scLcrn/INgtPTTz9abEL4gAgqWhAKugGGKqlawjqAQ=='
        let r: any

        r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser: invalidJoiningSignature,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })
    })

    describe('invitation resolution', () => {
      beforeEach(() => {
        mockUserManager.byId.mockImplementation(async () => joiningUser)
      })

      it('rejects ok', async () => {
        await InviteService.invitationResolution({
          allowJoin: false,
          walletOwner,
          joiningUserId,
          b64InviteSignatureByJoiningUser,
          b64InviteString,
        })

        let c = mockWalletManager.addRejectedInvite.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].inviteId).toBe(inviteId)

        c = mockInvitePubSubService.invitationReject.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].joiningUser.id).toBe(joiningUserId)

        c = mockWalletPubSubService.publishWalletUpdates.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].wallet.id).toBe(walletId)
      })

      it('accepts ok', async () => {
        mockInvitePubSubService.invitationAccept.mockImplementationOnce(
          async () => 1,
        )

        await InviteService.invitationResolution({
          allowJoin: true,
          walletOwner,
          joiningUserId,
          b64InviteSignatureByJoiningUser,
          b64InviteString,
          b64PublicECDHKey,
          encryptedSecretKey,
        })

        let c = mockWalletManager.addUser.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].userId).toBe(joiningUserId)
        expect(c[0][0].inviteId).toBe(inviteId)
        expect(c[0][0].walletId).toBe(walletId)

        c = mockInvitePubSubService.invitationAccept.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].joiningUser.id).toBe(joiningUserId)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].encryptedSecretKey).toBe(encryptedSecretKey)
        expect(c[0][0].b64PublicECDHKey).toBe(b64PublicECDHKey)

        c = mockWalletPubSubService.publishWalletUpdates.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].wallet.id).toBe(walletId)
      })

      it('throws if invalid public ecdh key or encrypted secret key', async () => {
        return expect(
          InviteService.invitationResolution({
            allowJoin: true,
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
            b64PublicECDHKey: null as any,
            encryptedSecretKey: null as any,
          }),
        ).rejects.toThrow(FormValidationError)
      })

      it('removes wa and throws if joining user is offline', async () => {
        const waId = '12341234'
        mockInvitePubSubService.invitationAccept.mockImplementationOnce(
          async () => 0,
        )
        mockWalletManager.addUser.mockImplementationOnce(async () => ({
          id: waId,
        }))

        const r = await expect(
          InviteService.invitationResolution({
            allowJoin: true,
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
            b64PublicECDHKey,
            encryptedSecretKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.joiningUserOffline)

        const c = mockWalletManager.removeUserByWaId.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0]).toBe(waId)
      })
    })

    describe('joining error', () => {
      it('works ok', async () => {
        mockWalletManager.removeWithJoiningError.mockImplementationOnce(
          async () => 1,
        )

        await InviteService.joiningError({ joiningUser, b64InviteString })

        let c = mockWalletManager.removeWithJoiningError.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].userId).toBe(joiningUserId)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].inviteId).toBe(inviteId)

        c = mockWalletPubSubService.publishWalletUpdates.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].wallet.id).toBe(walletId)

        c = mockInvitePubSubService.joiningError.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].ownerId).toBe(ownerId)
        expect(c[0][0].username).toBe(joiningUser.username)
      })

      it('throws if invalid invite string', async () => {
        return expect(
          InviteService.joiningError({
            joiningUser,
            b64InviteString: null as any,
          }),
        ).rejects.toThrow(FormValidationError)
      })

      it('throws if nothing was deleted', async () => {
        mockWalletManager.removeWithJoiningError.mockImplementationOnce(
          async () => 0,
        )

        const r = await expect(
          InviteService.joiningError({
            joiningUser,
            b64InviteString,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if no wallet or wallet owner was found', async () => {
        mockWalletManager.byId.mockImplementationOnce(async () => null)

        const r = await expect(
          InviteService.joiningError({
            joiningUser,
            b64InviteString,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })
    })
  })
})

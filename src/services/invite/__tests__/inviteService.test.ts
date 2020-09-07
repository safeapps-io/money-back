import { nanoid } from 'nanoid'

import { clearMocks } from '@/utils/jestHelpers'

const mockInviteStringService = {
    parseAndVerifySignature: jest.fn(),
    generatePrelaunchInvite: jest.fn(),
  },
  mockCryptoService = {
    verify: jest.fn(),
  },
  mockUserManager = {
    byId: jest.fn(),
    countInvitedBetweenDates: jest.fn(),
    isInviteDisposed: jest.fn(),
    countByMostInvites: jest.fn(),
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

jest.mock('@/services/invite/inviteStringService', () => ({
  __esModule: true,
  InviteStringService: mockInviteStringService,
}))
jest.mock('@/services/crypto/cryptoService', () => ({
  __esModule: true,
  CryptoService: mockCryptoService,
}))
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

import { InviteService, Prizes } from '../inviteService'
import { FormValidationError } from '@/services/errors'
import { AccessLevels } from '@/models/walletAccess.model'
import { InviteServiceFormErrors, InviteStringTypes } from '../inviteTypes'

describe('Invite service', () => {
  const walletId = '098765',
    ownerId = 'ownerId',
    joiningUserId = 'joiningId',
    b64InvitePublicKey = '1',
    b64PublicECDHKey = '1',
    encryptedSecretKey = '1',
    b64InviteSignatureByJoiningUser = '1',
    walletOwner = {
      id: ownerId,
      username: 'owner',
      b64InvitePublicKey,
    } as any,
    joiningUser = {
      id: joiningUserId,
      username: 'joiningUser',
      b64InvitePublicKey,
    } as any,
    b64InviteString = '1',
    inviteId = 'qwerty'

  beforeEach(() => {
    clearMocks(mockInviteStringService)
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

  describe('prelaunch invite', () => {
    const parseResult = {
      type: InviteStringTypes.prelaunch,
      payload: { userInviterId: ownerId },
    }
    beforeEach(() => {
      mockInviteStringService.parseAndVerifySignature.mockImplementation(
        async () => parseResult,
      )
    })

    it('works ok', async () => {
      const res = await InviteService.parseAndValidateInvite({
        b64InviteString,
        shouldAllowRealSignup: false,
      })
      expect(res).toEqual(parseResult)
    })

    it('throws if we pretend we want to use it for real signup', async () => {
      const r = expect(
        InviteService.parseAndValidateInvite({
          b64InviteString,
        }),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.cannotUsePrelaunchInvites)
    })

    it('shows correct waitlist stats', async () => {
      const userId = 'qwerty',
        encryptedUserId = InviteService.getUserIdEnctypted(userId),
        invitedCount = 12,
        inviteLink = 'qwert'

      /**
       * Users with invites: 100
       * This current user is #1.
       *
       * He gets every prize.
       */
      mockUserManager.countByMostInvites.mockImplementationOnce(async () => ({
        countMost: [
          { inviterId: userId, invitedCount },
          ...[...Array(99).keys()].map(() => ({
            inviterId: nanoid(),
            invitedCount: 6,
          })),
        ],
      }))
      mockInviteStringService.generatePrelaunchInvite.mockImplementation(
        () => inviteLink,
      )

      let r: any
      r = await InviteService.getCurrentWaitlistStats(encryptedUserId)
      expect(r).toEqual({
        prizes: [Prizes.disc30, Prizes.disc50, Prizes.disc90],
        currentInviteCount: invitedCount,
        inviteLink,
      })

      /**
       * Users with invites: 100
       * This current user is #49 with a single invite.
       *
       * He gets 30% discount and 50% discount.
       */
      mockUserManager.countByMostInvites.mockImplementationOnce(async () => ({
        countMost: [
          ...[...Array(48).keys()].map(() => ({
            inviterId: nanoid(),
            invitedCount: 6,
          })),
          { inviterId: userId, invitedCount: 1 },
          ...[...Array(51).keys()].map(() => ({
            inviterId: nanoid(),
            invitedCount: 1,
          })),
        ],
      }))
      r = await InviteService.getCurrentWaitlistStats(encryptedUserId)
      expect(r).toEqual({
        prizes: [Prizes.disc30, Prizes.disc50],
        currentInviteCount: 1,
        inviteLink,
      })

      /**
       * Users with invites: 1000
       * This current user is #1000 with a single invite.
       *
       * He gets 30% discount.
       */
      mockUserManager.countByMostInvites.mockImplementationOnce(async () => ({
        countMost: [
          ...[...Array(999).keys()].map(() => ({
            inviterId: nanoid(),
            invitedCount: 6,
          })),
          { inviterId: userId, invitedCount: 1 },
        ],
      }))
      r = await InviteService.getCurrentWaitlistStats(encryptedUserId)
      expect(r).toEqual({
        prizes: [Prizes.disc30],
        currentInviteCount: 1,
        inviteLink,
      })

      /**
       * Current user hasn't invited anyone yet. Nothing!
       */
      mockUserManager.countByMostInvites.mockImplementationOnce(async () => ({
        countMost: [...Array(999).keys()].map(() => ({
          inviterId: nanoid(),
          invitedCount: 6,
        })),
      }))
      r = await InviteService.getCurrentWaitlistStats(encryptedUserId)
      expect(r).toEqual({ prizes: [], currentInviteCount: 0, inviteLink })
    })

    it('throws if bullshit is encoded', async () => {
      const r = expect(InviteService.getCurrentWaitlistStats('qwerty')).rejects
      await r.toThrowError(FormValidationError)
      await r.toThrowError(InviteServiceFormErrors.unknownError)
    })
  })

  describe('service invite', () => {
    const parseResult = {
      type: InviteStringTypes.service,
      userInviter: { id: ownerId, b64InvitePublicKey },
      payload: { userInviterId: ownerId, inviteId },
    }

    beforeEach(() => {
      mockInviteStringService.parseAndVerifySignature.mockImplementation(
        async () => parseResult,
      )
      mockUserManager.isInviteDisposed.mockImplementation(async () => 0)
    })

    it('works ok', async () => {
      const res = await InviteService.parseAndValidateInvite({
        b64InviteString,
      })
      expect(res).toEqual(parseResult)
    })

    it('throws error if invite has already been disposed', async () => {
      mockUserManager.isInviteDisposed.mockImplementationOnce(async () => 1)

      const r = expect(
        InviteService.parseAndValidateInvite({
          b64InviteString,
        }),
      ).rejects

      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.inviteAlreadyUsed)
    })

    it('throws if limit is reached', async () => {
      mockUserManager.countInvitedBetweenDates.mockImplementationOnce(
        async () => 25,
      )

      const r = expect(
        InviteService.parseAndValidateInvite({
          b64InviteString,
        }),
      ).rejects

      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.limitReached)
    })
  })

  describe('wallet invite', () => {
    beforeEach(() => {
      mockInviteStringService.parseAndVerifySignature.mockImplementation(
        async () => ({
          type: InviteStringTypes.wallet,
          userInviter: { id: ownerId, b64InvitePublicKey },
          payload: { inviteId, userInviterId: ownerId, walletId },
        }),
      )
    })

    describe('wallet join', () => {
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
        const r = expect(
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

        const r = expect(
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

        const r = expect(
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

      it('throws if owner is offline', async () => {
        mockInvitePubSubService.requestToOwner.mockImplementationOnce(
          async () => 0,
        )

        const r = expect(
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
        mockCryptoService.verify.mockImplementation(async () => true)
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

        r = expect(
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

        r = expect(
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

        const r = expect(
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
        mockCryptoService.verify.mockImplementationOnce(async () => false)

        const r = expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
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

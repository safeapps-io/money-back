import nanoid from 'nanoid'

const mockWalletManager = {
    byId: jest.fn().mockImplementation(async (id: string) => ({
      id,
      updated: new Date(),
      users: [],
    })),
    byIds: jest.fn(),
    byUserId: jest.fn(),
    byIdAndUserId: jest.fn(),
    create: jest
      .fn()
      .mockImplementation(async () => ({ id: nanoid(), updated: new Date() })),
    destroy: jest.fn(),
    createOwner: jest.fn(),
    addUser: jest.fn(),
    removeUser: jest.fn(),
    updateChests: jest.fn(),
  },
  mockWalletPubSubService = {
    publishWalletDestroy: jest.fn(),
    publishWalletUpdates: jest.fn(),
  }

jest.mock('@/models/wallet.model', () => ({
  __esModule: true,
  WalletManager: mockWalletManager,
}))
jest.mock('@/services/wallet/walletPubSubService', () => ({
  __esModule: true,
  WalletPubSubService: mockWalletPubSubService,
}))

import { WalletService } from '../walletService'
import { FormValidationError, AccessError } from '@/services/errors'
import { AccessLevels } from '@/models/walletAccess.model'

const mockClear = (mock: Object) =>
    Object.values(mock).forEach(i => i.mockClear()),
  userId = '1',
  userToAddId = '2',
  userToRemoveId = '3',
  walletId = '1',
  chest = 'chest'

mockWalletManager.byIdAndUserId.mockImplementation(
  async ({ userId: requesterUserId, walletId }) => {
    if (requesterUserId !== userToAddId)
      return {
        id: walletId,
        updated: new Date(),
        users: [
          {
            id: userId,
            WalletAccess: { accessLevel: AccessLevels.owner },
          },
          {
            id: userToRemoveId,
            WalletAccess: { accessLevel: AccessLevels.usual },
          },
        ],
      }
  },
)

describe('Wallet Service', () => {
  beforeEach(() => {
    mockClear(mockWalletManager)
    mockClear(mockWalletPubSubService)
  })

  describe('create', () => {
    it('works fine', async () => {
      await WalletService.create(userId, chest)

      expect(mockWalletManager.create.mock.calls.length).toBe(1)

      expect(mockWalletManager.createOwner.mock.calls.length).toBe(1)
      const {
        chest: _chest,
        userId: _userId,
      } = mockWalletManager.createOwner.mock.calls[0][0]
      expect(_chest).toBe(chest)
      expect(_userId).toBe(userId)
    })

    it('throws if invalid data', async () => {
      await expect(
        WalletService.create(userId, undefined as any),
      ).rejects.toThrowError(FormValidationError)

      await expect(WalletService.create(userId, '')).rejects.toThrowError(
        FormValidationError,
      )
    })
  })

  describe('destroy', () => {
    it('works fine', async () => {
      mockWalletManager.byId.mockImplementation(async id => ({
        id,
        updated: new Date(),
        users: [
          { id: userId, WalletAccess: { accessLevel: AccessLevels.owner } },
        ],
      }))

      await WalletService.destroy(userId, walletId)

      expect(mockWalletManager.destroy.mock.calls.length).toBe(1)
      expect(mockWalletManager.destroy.mock.calls[0][0]).toBe(walletId)

      expect(
        mockWalletPubSubService.publishWalletDestroy.mock.calls.length,
      ).toBe(1)
      const {
        walletId: _walletId,
        connectedUserIds,
      } = mockWalletPubSubService.publishWalletDestroy.mock.calls[0][0]
      expect(_walletId).toBe(walletId)
      expect(connectedUserIds).toEqual([userId])
    })

    it('throws if invalid data', async () => {
      await expect(WalletService.destroy('', '')).rejects.toThrow(
        FormValidationError,
      )
    })

    it('throws if not owner', async () => {
      mockWalletManager.byId.mockImplementationOnce(async () => ({
        users: [
          { id: 'asd', WalletAccess: { accessLevel: AccessLevels.owner } },
        ],
      }))
      await expect(WalletService.destroy(userId, walletId)).rejects.toThrow(
        AccessError,
      )
    })

    it('throws if user not connected to the wallet', async () => {
      mockWalletManager.byId.mockImplementationOnce(async () => null)
      await expect(WalletService.destroy(userId, walletId)).rejects.toThrow(
        AccessError,
      )
    })
  })

  describe('remove user', () => {
    const initiatorId = userId

    beforeEach(() => {
      mockClear(mockWalletManager)
      mockClear(mockWalletManager)
      mockClear(mockWalletPubSubService)
    })

    it('works if owner removes someone', async () => {
      await WalletService.removeUser({ initiatorId, walletId, userToRemoveId })

      expect(mockWalletManager.removeUser.mock.calls.length).toBe(1)
      const {
        walletId: _walletId,
        userId: _userId,
      } = mockWalletManager.removeUser.mock.calls[0][0]
      expect(_walletId).toBe(walletId)
      expect(_userId).toBe(userToRemoveId)

      expect(
        mockWalletPubSubService.publishWalletUpdates.mock.calls.length,
      ).toBe(1)
      const {
        wallet: _wallet,
      } = mockWalletPubSubService.publishWalletUpdates.mock.calls[0][0]
      expect(_wallet.id).toBe(walletId)
    })

    it('works if someone removes self', async () => {
      await WalletService.removeUser({
        initiatorId: userToRemoveId,
        walletId,
        userToRemoveId,
      })

      expect(mockWalletManager.removeUser.mock.calls.length).toBe(1)
      const {
        walletId: _walletId,
        userId: _userId,
      } = mockWalletManager.removeUser.mock.calls[0][0]
      expect(_walletId).toBe(walletId)
      expect(_userId).toBe(userToRemoveId)

      expect(
        mockWalletPubSubService.publishWalletUpdates.mock.calls.length,
      ).toBe(1)
      const {
        wallet: _wallet,
      } = mockWalletPubSubService.publishWalletUpdates.mock.calls[0][0]
      expect(_wallet.id).toBe(walletId)
    })

    it('throws if invalid data', async () => {
      await expect(
        WalletService.removeUser({
          initiatorId: null,
          walletId: null,
          userToRemoveId: null,
        } as any),
      ).rejects.toThrow(FormValidationError)
    })

    it('throws if not owner tries to remove user', async () => {
      await expect(
        WalletService.removeUser({
          initiatorId: userToRemoveId,
          walletId,
          userToRemoveId: userId,
        } as any),
      ).rejects.toThrow(AccessError)
    })

    it('throws if owner tries to remove self', async () => {
      await expect(
        WalletService.removeUser({
          initiatorId: userToRemoveId,
          walletId,
          userToRemoveId: 'werwer',
        } as any),
      ).rejects.toThrow(AccessError)
    })
  })

  describe('update chests', () => {
    const [walletId1, walletId2] = ['1', '2'],
      [waWalletId1, waWalletId2] = ['1234', 'qwerqwer'],
      chest = 'asd',
      constructWallet = (userId: string, walletId: string, waId: string) => ({
        id: walletId,
        users: [
          { id: userId, WalletAccess: { id: waId } },
          { id: 'userIdOther', WalletAccess: { id: nanoid() } },
        ],
      })

    it('works fine', async () => {
      mockWalletManager.byUserId.mockImplementation(async () => [
        constructWallet(userId, walletId1, waWalletId1),
        constructWallet(userId, walletId2, waWalletId2),
      ])
      mockWalletManager.byIds.mockImplementation(async () => [
        constructWallet(userId, walletId1, waWalletId1),
        constructWallet(userId, walletId2, waWalletId2),
      ])

      await WalletService.updateChests({
        userId,
        chests: [
          { walletId: walletId1, chest },
          { walletId: walletId2, chest },
        ],
      })

      expect(mockWalletManager.updateChests.mock.calls.length).toBe(1)
      expect(mockWalletManager.updateChests.mock.calls[0][0]).toEqual([
        { id: waWalletId1, chest },
        { id: waWalletId2, chest },
      ])

      expect(
        mockWalletPubSubService.publishWalletUpdates.mock.calls.length,
      ).toBe(2)
    })

    it('throws if user wallets and incoming data doest are not fully represented', async () => {
      mockWalletManager.byUserId.mockImplementation(async () => [
        constructWallet(userId, walletId1, waWalletId1),
      ])

      await expect(
        WalletService.updateChests({
          userId,
          chests: [
            { walletId: walletId1, chest },
            { walletId: walletId2, chest },
          ],
        }),
      ).rejects.toThrow(AccessError)

      await expect(
        WalletService.updateChests({
          userId,
          chests: [{ walletId: 'newWalletId', chest }],
        }),
      ).rejects.toThrow(AccessError)
    })

    it('throws if data is invalid', async () => {
      await expect(
        WalletService.updateChests({
          userId: null as any,
          chests: [{ walletId: null as any, chest: null as any }],
        }),
      ).rejects.toThrow(FormValidationError)
    })
  })
})

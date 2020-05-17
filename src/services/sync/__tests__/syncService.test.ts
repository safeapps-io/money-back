import { sub } from 'date-fns'

const mockEnitityManager = {
    filterByIds: jest.fn(),
    bulkCreate: jest.fn(),
    updateEntity: jest.fn(),
    getUpdates: jest.fn(),
  },
  mockWalletService = { checkIfUserHasAccess: jest.fn() }

jest.mock('@/models/entity.model', () => ({
  __esModule: true,
  EntityManager: mockEnitityManager,
}))

jest.mock('@/services/wallet/walletService', () => ({
  __esModule: true,
  WalletService: mockWalletService,
}))

import { SyncService } from '../syncService'
import { ClientChangesData } from '../types'
import { FormValidationError, AccessError } from '@/core/errors'

describe('Sync service', () => {
  const walletId = '1234',
    userId = 'qwerqwer',
    entityMap = [
      {
        walletId,
        latestUpdated: 1234,
        entities: [
          { id: 'qwer', clientUpdated: 1234, encr: 'text', walletId },
          {
            id: 'qwer',
            clientUpdated: 1234,
            encr: 'text',
            walletId: 'otherId',
          },
        ],
      },
    ] as ClientChangesData,
    copyEntityMap = () => JSON.parse(JSON.stringify(entityMap))

  beforeEach(() => {
    mockWalletService.checkIfUserHasAccess.mockClear()
    mockEnitityManager.bulkCreate.mockClear()
  })

  it('filters out entities, that belong to other wallet', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap })
    expect(mockEnitityManager.bulkCreate.mock.calls[0][0]).toEqual(
      entityMap[0].entities.filter(
        ent => ent.walletId === walletId && !ent.updated,
      ),
    )
  })

  it('checks if user has access to wallet', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap })
    expect(mockWalletService.checkIfUserHasAccess.mock.calls.length).toBe(2)
    expect(mockWalletService.checkIfUserHasAccess.mock.calls[0][0].userId).toBe(
      userId,
    )
    expect(
      mockWalletService.checkIfUserHasAccess.mock.calls[0][0].walletId,
    ).toBe(walletId)
  })

  it('ignores wallets, that user has no access to', async () => {
    const copy = copyEntityMap(),
      noAccessWalletId = 'woeifwjoeif'
    copy[1] = {
      latestUpdated: 1234,
      walletId: noAccessWalletId,
      entities: [{ ...copy[0].entities[0], walletId: noAccessWalletId }],
    }
    mockWalletService.checkIfUserHasAccess.mockImplementation(async args => {
      if (args.walletId === noAccessWalletId) throw new AccessError()
    })

    await SyncService.handleClientUpdates({ userId, entityMap: copy })
    // only saves one wallet
    expect(mockEnitityManager.bulkCreate.mock.calls.length).toBe(1)
  })

  it('throws if object is of invalid form', async () => {
    const copy = copyEntityMap()
    delete copy[0].entities[0].id
    try {
      await SyncService.handleClientUpdates({ userId, entityMap: copy })
      throw new Error()
    } catch (error) {
      expect(error).toBeInstanceOf(FormValidationError)
    }
  })

  it('creates transactions without updated', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap })
    expect(mockEnitityManager.bulkCreate.mock.calls.length).toBe(1)
    expect(mockEnitityManager.bulkCreate.mock.calls[0][0]).toEqual(
      entityMap[0].entities.filter(
        ent => ent.walletId === walletId && !ent.updated,
      ),
    )
  })

  it('runs check against fetched updated', async () => {
    const buildEnt = ({
        id,
        updated,
        clientUpdated,
      }: {
        id: string
        updated: Date
        clientUpdated?: Date
      }) => ({
        id,
        updated,
        clientUpdated: clientUpdated ? clientUpdated.getTime() : undefined,
        encr: 'text',
        walletId,
      }),
      entToBeSaved = buildEnt({
        id: 'qwer2',
        updated: sub(new Date(), { days: 1 }),
        clientUpdated: sub(new Date(), { hours: 1 }),
      }),
      entityMap = [
        {
          walletId,
          latestUpdated: 1234,
          entities: [
            buildEnt({
              id: 'qwer1',
              updated: sub(new Date(), { days: 2 }),
              clientUpdated: sub(new Date(), { hours: 2 }),
            }),
            entToBeSaved,
          ],
        },
      ] as ClientChangesData

    mockEnitityManager.filterByIds.mockImplementationOnce(async () => [
      buildEnt({ id: 'qwer1', updated: sub(new Date(), { hours: 1 }) }),
      buildEnt({ id: 'qwer2', updated: sub(new Date(), { hours: 5 }) }),
    ])

    await SyncService.handleClientUpdates({ userId, entityMap })

    expect(mockEnitityManager.updateEntity.mock.calls.length).toBe(1)
    expect(mockEnitityManager.updateEntity.mock.calls[0][0].newEntity).toEqual(
      entToBeSaved,
    )
  })
})

import { sub } from 'date-fns'

const mockEnitityManager = {
    byIds: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    getUpdates: jest.fn(),
  },
  mockWalletService = {
    checkIfUserHasAccess: jest.fn(),
    getUserWalletIds: jest.fn(),
  },
  mockSyncPubSubService = {
    publishEntitiesUpdates: jest.fn(),
    subscribeEntitiesUpdates: jest.fn(),
    unsubscribeEntitiesUpdates: jest.fn(),
  }

jest.mock('@/models/entity.model', () => ({
  __esModule: true,
  EntityManager: mockEnitityManager,
}))
jest.mock('@/services/wallet/walletService', () => ({
  __esModule: true,
  WalletService: mockWalletService,
}))
jest.mock('@/services/sync/syncPubSubService', () => ({
  __esModule: true,
  SyncPubSubService: mockSyncPubSubService,
}))

import { SyncService } from '../syncService'
import { ClientChangesData } from '../types'
import { FormValidationError } from '@/services/errors'

describe('Sync service', () => {
  const walletId = '1234',
    socketId = '132',
    userId = 'qwerqwer',
    entityMap = ({
      [walletId]: {
        entities: [
          { id: 'qwer', clientUpdated: 1234, encr: 'text', walletId },
          {
            id: 'qwer',
            clientUpdated: 1234,
            encr: 'text',
            walletId: 'otherId',
          },
        ],
        latestUpdated: 1234,
      },
    } as unknown) as ClientChangesData,
    copyEntityMap = () => JSON.parse(JSON.stringify(entityMap))

  beforeEach(() => {
    mockWalletService.getUserWalletIds.mockClear()
    mockWalletService.getUserWalletIds.mockImplementation(async userId => [
      walletId,
    ])
    mockSyncPubSubService.publishEntitiesUpdates.mockClear()

    mockEnitityManager.bulkCreate.mockClear()
    mockEnitityManager.bulkCreate.mockImplementation(async ents => ents)
    mockEnitityManager.update.mockImplementation(
      async ({ newEntity }) => newEntity,
    )
  })

  it('filters out entities, that belong to other wallet', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap, socketId })
    expect(mockEnitityManager.bulkCreate.mock.calls[0][0]).toEqual(
      entityMap[walletId].entities.filter(
        ent => ent.walletId === walletId && !ent.updated,
      ),
    )
  })

  it('checks if user has access to wallet', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap, socketId })
    expect(mockWalletService.getUserWalletIds.mock.calls.length).toBe(1)
    expect(mockWalletService.getUserWalletIds.mock.calls[0][0]).toBe(userId)
  })

  it('ignores wallets, that user has no access to', async () => {
    const copy = copyEntityMap(),
      noAccessWalletId = 'woeifwjoeif'
    copy[noAccessWalletId] = {
      entities: [{ ...copy[walletId].entities[0], walletId: noAccessWalletId }],
      latestUpdated: 1234,
    }

    await SyncService.handleClientUpdates({ userId, entityMap: copy, socketId })
    // only saves one wallet
    expect(mockEnitityManager.bulkCreate.mock.calls.length).toBe(1)
  })

  it('throws if object is of invalid form', async () => {
    const copy = copyEntityMap()
    delete copy[walletId].entities[0].id
    await expect(
      SyncService.handleClientUpdates({
        userId,
        entityMap: copy,
        socketId,
      }),
    ).rejects.toThrow(FormValidationError)
  })

  it('creates transactions without updated', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap, socketId })
    expect(mockEnitityManager.bulkCreate.mock.calls.length).toBe(1)
    expect(mockEnitityManager.bulkCreate.mock.calls[0][0]).toEqual(
      entityMap[walletId].entities.filter(
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
        updated: number | Date
        clientUpdated?: number | Date
      }) => ({
        id,
        updated,
        clientUpdated,
        encr: 'text',
        walletId,
      }),
      entToBeSaved = buildEnt({
        id: 'qwer2',
        updated: sub(new Date(), { days: 1 }).getTime(),
        clientUpdated: sub(new Date(), { hours: 1 }).getTime(),
      }),
      entityMap = ({
        [walletId]: {
          latestUpdated: 1234,
          entities: [
            buildEnt({
              id: 'qwer1',
              updated: sub(new Date(), { days: 2 }).getTime(),
              clientUpdated: sub(new Date(), { hours: 2 }).getTime(),
            }),
            entToBeSaved,
          ],
        },
      } as unknown) as ClientChangesData

    mockEnitityManager.byIds.mockImplementationOnce(async () => [
      buildEnt({ id: 'qwer1', updated: sub(new Date(), { hours: 1 }) }),
      buildEnt({ id: 'qwer2', updated: sub(new Date(), { hours: 5 }) }),
    ])

    await SyncService.handleClientUpdates({ userId, entityMap, socketId })

    expect(mockEnitityManager.update.mock.calls.length).toBe(1)
    expect(mockEnitityManager.update.mock.calls[0][1]).toEqual(entToBeSaved)
  })

  it('publishes stuff to redis after saving', async () => {
    await SyncService.handleClientUpdates({ userId, entityMap, socketId })

    expect(mockSyncPubSubService.publishEntitiesUpdates.mock.calls.length).toBe(
      1,
    )
    const args = mockSyncPubSubService.publishEntitiesUpdates.mock.calls[0][0]
    expect(args.walletId).toBe(walletId)
    expect(args.socketId).toBe(socketId)
    expect(args.data).toEqual(
      entityMap[walletId].entities.filter(ent => ent.walletId === walletId),
    )
  })
})

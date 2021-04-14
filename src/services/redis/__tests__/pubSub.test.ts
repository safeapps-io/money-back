const mockConnection = {
    publish: jest.fn(),
  },
  mockSubscriptionConnection = {
    on: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }

jest.mock('@/services/redis/connection', () => ({
  __esModule: true,
  connection: mockConnection,
  subscriptionConnection: mockSubscriptionConnection,
}))

import { redisPubSub } from '../pubSub'
import { clearMocks } from '@/utils/jestHelpers'

describe('Redis PubSub', () => {
  const channels = ['channel'],
    otherChannels = ['otherChannels'],
    clientId = 'subsId',
    callback = jest.fn(),
    callbackKey = '1',
    callback2 = jest.fn(),
    callbackKey2 = '2',
    data = 'hey'

  beforeEach(() => {
    clearMocks(mockSubscriptionConnection)
    clearMocks(mockConnection)
    callback.mockClear()
    callback2.mockClear()

    redisPubSub.log.clear()
  })

  it('subscribing to messages during init', async () => {
    await redisPubSub.init()
    expect(mockSubscriptionConnection.on.mock.calls.length).toBe(1)
  })

  it('subscribes and calls callbacks if it is not from the same publisher', async () => {
    await redisPubSub.subscribe({
      channels,
      clientId,
      callback,
      callbackKey,
    })
    await redisPubSub.subscribe({
      channels: otherChannels,
      clientId,
      callback: callback2,
      callbackKey: callbackKey2,
    })
    expect(mockSubscriptionConnection.subscribe.mock.calls.length).toBe(2)

    redisPubSub.handleMessage(
      channels[0],
      JSON.stringify({ data, id: clientId }),
    )
    expect(callback.mock.calls.length).toBe(0)

    redisPubSub.handleMessage(
      channels[0],
      JSON.stringify({ data, id: 'otherId' }),
    )
    expect(callback2.mock.calls.length).toBe(0)
    expect(callback.mock.calls.length).toBe(1)
    expect(callback.mock.calls[0][0]).toBe(data)
  })

  it('does not subscribe in redis if subscription was already triggered', async () => {
    await redisPubSub.subscribe({
      channels,
      clientId,
      callback,
      callbackKey,
    })
    await redisPubSub.subscribe({
      channels,
      clientId: 'other',
      callback,
      callbackKey,
    })
    expect(mockSubscriptionConnection.subscribe.mock.calls.length).toBe(1)
  })

  it('publishes messages', async () => {
    await redisPubSub.publish({
      channel: channels[0],
      clientId,
      data: { data },
    })

    expect(mockConnection.publish.mock.calls.length).toBe(1)
    expect(mockConnection.publish.mock.calls[0][0]).toBe(channels[0])
    expect(mockConnection.publish.mock.calls[0][1]).toBe(
      JSON.stringify({ id: clientId, data: { data } }),
    )
  })

  it('ubsubcribes when there is not other function handlers', async () => {
    const callbackKey = 'hey',
      callbackKey2 = 'hey2'

    await redisPubSub.subscribe({
      channels,
      clientId,
      callback,
      callbackKey,
    })
    await redisPubSub.subscribe({
      channels,
      clientId,
      callback: callback2,
      callbackKey: callbackKey2,
    })

    await redisPubSub.removeHandler({ channels, clientId, callbackKey })
    expect(mockSubscriptionConnection.unsubscribe.mock.calls.length).toBe(0)
    expect(Object.keys(redisPubSub.log.get(channels[0])!).length).toBe(1)

    await redisPubSub.removeHandler({
      channels,
      clientId,
      callbackKey: callbackKey2,
    })
    expect(mockSubscriptionConnection.unsubscribe.mock.calls.length).toBe(1)
    expect(redisPubSub.log.get(channels[0])).toBeUndefined()
  })

  it('unsubscribes when there is no other listeners', async () => {
    const otherSubscriberId = 'otherId'

    await redisPubSub.subscribe({
      channels,
      clientId,
      callback,
      callbackKey,
    })
    await redisPubSub.subscribe({
      channels,
      clientId: otherSubscriberId,
      callback,
      callbackKey,
    })

    await redisPubSub.unsubscribe({ channels, clientId })
    expect(mockSubscriptionConnection.unsubscribe.mock.calls.length).toBe(0)
    expect(Object.keys(redisPubSub.log.get(channels[0])!).length).toBe(1)

    await redisPubSub.unsubscribe({ channels, clientId: otherSubscriberId })
    expect(mockSubscriptionConnection.unsubscribe.mock.calls.length).toBe(1)
    expect(redisPubSub.log.get(channels[0])).toBeUndefined()
  })
})

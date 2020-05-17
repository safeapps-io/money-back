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

describe('Redis PubSub', () => {
  const channels = ['channel'],
    subscriberId = 'subsId',
    callback = jest.fn(),
    data = 'hey'

  beforeEach(() => {
    mockSubscriptionConnection.on.mockClear()
    callback.mockClear()
  })

  it('subscribing to messages during init', async () => {
    await redisPubSub.init()
    expect(mockSubscriptionConnection.on.mock.calls.length).toBe(1)
  })

  it('subscribes and calls callbacks if it is not from the same publisher', async () => {
    await redisPubSub.subscribe({
      channels,
      subscriberId,
      callback,
    })
    expect(mockSubscriptionConnection.subscribe.mock.calls.length).toBe(1)

    redisPubSub.handleMessage(
      channels[0],
      JSON.stringify({ data, id: subscriberId }),
    )
    redisPubSub.handleMessage(
      'otherChannel',
      JSON.stringify({ data, id: subscriberId }),
    )
    expect(callback.mock.calls.length).toBe(0)

    redisPubSub.handleMessage(
      channels[0],
      JSON.stringify({ data, id: 'otherId' }),
    )
    expect(callback.mock.calls.length).toBe(1)
    expect(callback.mock.calls[0][0]).toBe(data)
  })

  it('publishes messages', async () => {
    await redisPubSub.publish({
      channel: channels[0],
      publisherId: subscriberId,
      data: { data },
    })

    expect(mockConnection.publish.mock.calls.length).toBe(1)
    expect(mockConnection.publish.mock.calls[0][0]).toBe(channels[0])
    expect(mockConnection.publish.mock.calls[0][1]).toBe(
      JSON.stringify({ id: subscriberId, data: { data } }),
    )
  })

  it('unsubscribes when these is no other listeners', async () => {
    const otherSubscriberId = 'otherId'

    await redisPubSub.subscribe({
      channels,
      subscriberId,
      callback,
    })
    await redisPubSub.subscribe({
      channels,
      subscriberId: otherSubscriberId,
      callback,
    })

    await redisPubSub.unsubscribe({ channels, subscriberId })
    expect(mockSubscriptionConnection.unsubscribe.mock.calls.length).toBe(0)
    expect(Object.keys(redisPubSub.log[channels[0]]).length).toBe(1)

    await redisPubSub.unsubscribe({ channels, subscriberId: otherSubscriberId })
    expect(mockSubscriptionConnection.unsubscribe.mock.calls.length).toBe(1)
    expect(redisPubSub.log[channels[0]]).toBeUndefined()
  })
})

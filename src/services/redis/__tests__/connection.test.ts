import {
  subscriptionConnection,
  connection,
  initRedisConnection,
} from '../connection'
import delay from '@/utils/delay'

describe('Redis connection works', () => {
  beforeAll(() => initRedisConnection())

  it('publishes and subscribes', async () => {
    const cb = jest.fn(),
      subscription = 'test',
      message = 'test message'

    await subscriptionConnection.subscribe(subscription)

    subscriptionConnection.on('message', cb)
    await connection.publish(subscription, message)

    await delay(100)
    expect(cb.mock.calls.length).toBe(1)
    expect(cb.mock.calls[0][0]).toBe(subscription)
    expect(cb.mock.calls[0][1]).toBe(message)
  })
})

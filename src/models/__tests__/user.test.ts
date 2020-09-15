import { nanoid } from 'nanoid'

import sequelize from '../setup'
import { UserManager } from '../user.model'

describe('User manager', () => {
  beforeAll(async () => {
    await sequelize.sync()
  })

  it('calculates invite count stats correctly', async () => {
    // We should have >5 users: 2 without invite id, 2 — with user1, 1 — with user 2
    const [user1, user2] = await Promise.all([
      UserManager.create({ username: nanoid(), password: '' }),
      UserManager.create({ username: nanoid(), password: '' }),
    ])
    const [user3, ...rest] = await Promise.all([
      UserManager.create({
        username: nanoid(),
        password: '',
        inviterId: user1.id,
      }),
      UserManager.create({
        username: nanoid(),
        password: '',
        inviterId: user1.id,
      }),
      UserManager.create({
        username: nanoid(),
        password: '',
        inviterId: user2.id,
      }),
    ])

    const { userCount, countMost } = await UserManager.countByMostInvites()
    expect(userCount).toBeGreaterThanOrEqual(5)

    const user1Stat = countMost.find((item) => item.inviterId == user1.id),
      user2Stat = countMost.find((item) => item.inviterId == user2.id),
      user3Stat = countMost.find((item) => item.inviterId == user3.id)

    expect(user1Stat!.invitedCount).toBe(2)
    expect(user2Stat!.invitedCount).toBe(1)
    expect(user3Stat).toBeUndefined()
  })
})

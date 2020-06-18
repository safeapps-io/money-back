import { nanoid } from 'nanoid'

import sequelize from '../setup'

import { WalletManager } from '../wallet.model'
import { UserManager } from '../user.model'
import { AccessLevels } from '../walletAccess.model'

describe('Wallet manager', () => {
  let userId: string

  beforeAll(async () => {
    await sequelize.sync()
    const user = await UserManager.create({ password: '', username: nanoid() })
    userId = user.id
  })

  it('creates wallet and user at the same time', async () => {
    const w = await WalletManager.create({ userId, chest: '' }),
      user = w.users[0]

    expect(typeof w.id).toBe('string')
    expect(user.id).toBe(userId)
    expect(user.WalletAccess.accessLevel).toBe(AccessLevels.owner)
  })

  it('fetches users wallets only', async () => {
    const newUser = await UserManager.create({
        password: '',
        username: nanoid(),
      }),
      [w1, w2] = await Promise.all([
        WalletManager.create({ userId: newUser.id, chest: '' }),
        WalletManager.create({ userId: newUser.id, chest: '' }),
      ]),
      refetched = await WalletManager.byUserId(newUser.id)

    expect(refetched.length).toBe(2)
    expect(refetched.map((w) => w.id)).toEqual([w1.id, w2.id])
  })
})

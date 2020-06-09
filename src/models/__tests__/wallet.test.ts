import sequelize from '../setup'

import { WalletManager } from '../wallet.model'
import { UserManager } from '../user.model'

describe('Wallet manager', () => {
  let userId: string

  beforeAll(async () => {
    await sequelize.sync()
    const user = await UserManager.create({ password: '', username: '' })
    userId = user.id
  })

  it('creates wallet and manager in the same transaction', () => {
    return expect(
      WalletManager.create({ userId, chest: '' }),
    ).resolves.toBeTruthy()
  })
})

import { nanoid } from 'nanoid'

import sequelize from '../setup'

import Wallet, { WalletManager } from '../wallet.model'
import { UserManager } from '../user.model'
import { AccessLevels } from '../walletAccess.model'

describe('Wallet manager', () => {
  let userId: string, wallet: Wallet

  beforeAll(async () => {
    await sequelize.sync()
    const user = await UserManager.create({ password: '', username: nanoid() })
    userId = user.id
    wallet = await WalletManager.create({ userId, chest: '' })
  })

  it('creates wallet and user at the same time', async () => {
    const user = wallet.users[0]

    expect(typeof wallet.id).toBe('string')
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

  it('serializes wallet users without private data', () => {
    const json = wallet.toJSON(),
      user = json.users[0]

    expect(user.encr).toBeUndefined()
    expect(user.inviterId).toBeUndefined()
    expect(user.email).toBeUndefined()
    expect(user.b64InvitePublicKey).toBeUndefined()
    expect(user.b64EncryptedInvitePrivateKey).toBeUndefined()
    expect(user.b64salt).toBeUndefined()

    expect(user.WalletAccess.userId).toBeUndefined()
    expect(user.WalletAccess.walletId).toBeUndefined()
  })
})

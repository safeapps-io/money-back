import { nanoid } from 'nanoid'

import sequelize, { getTransaction } from '../setup'
import Wallet from '../wallet.model'

describe('Transactions work', () => {
  beforeAll(() => sequelize.sync())

  it('reverses transaction if error is thrown', async () => {
    /**
     * This test is not that useless. It took some time to set up transactions in sequelize, so
     * I want to be sure it will not go away with a small change.
     */

    const id = nanoid()

    try {
      await getTransaction(async () => {
        await Wallet.create({ id })
        throw new Error()
      })
    } catch (error) {
      // --
    }

    return expect(Wallet.findByPk(id)).resolves.toBeFalsy()
  })
})

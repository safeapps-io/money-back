import { isEqual } from 'lodash'
import { nanoid } from 'nanoid'
import { encode } from 'base64-arraybuffer'

import sequelize from '../setup'

import { EntityManager } from '../entity.model'
import Wallet from '../wallet.model'

describe('Entity model manager', () => {
  let walletId: string
  const rawEncr = Buffer.from('Hey there!'),
    encodedEncr = encode(rawEncr)

  beforeAll(async () => {
    await sequelize.sync()
    const wallet = await Wallet.create()
    walletId = wallet.id
  })

  it('saves binary data instead of b64string', async () => {
    /**
     * We make no trandformations to the data. We just pass it to save/create/update methods
     * with data encrypted as b64-strings, but have the raw bytes be saved to DB.
     *
     * We also get seamless decoding while getting the property.
     */
    let saved = (
        await EntityManager.bulkCreate([
          { id: nanoid(), walletId, encr: encodedEncr } as any,
        ])
      )[0],
      fetched = (await EntityManager.byIds({ ids: [saved.id], walletId }))[0]

    expect(isEqual(saved.getDataValue('encr'), rawEncr)).toBeTruthy()
    expect(isEqual(fetched.getDataValue('encr'), rawEncr)).toBeTruthy()
    expect(saved.encr).toBe(encodedEncr)
    expect(fetched.encr).toBe(encodedEncr)

    await EntityManager.update(saved.id, { encr: '' })
    saved = await EntityManager.update(saved.id, { encr: encodedEncr })
    fetched = (await EntityManager.byIds({ ids: [saved.id], walletId }))[0]

    expect(isEqual(saved.getDataValue('encr'), rawEncr)).toBeTruthy()
    expect(isEqual(fetched.getDataValue('encr'), rawEncr)).toBeTruthy()
    expect(saved.encr).toBe(encodedEncr)
    expect(fetched.encr).toBe(encodedEncr)
  })
})

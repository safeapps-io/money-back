import { encryptAes, decryptAes } from '../crypto'

describe('Crypto module', () => {
  it('aes encryption works', () => {
    const obj = { qwerty: 1234 }

    const encrypted = encryptAes(obj)
    expect(decryptAes(encrypted)).toEqual(obj)
  })
})

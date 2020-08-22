import { decode } from 'base64-arraybuffer'
import { Crypto } from '@peculiar/webcrypto'

const crypto = new Crypto()

export class CryptoService {
  static signatureAlgorithm = 'RSA-PSS'
  static hashAlgorithm = 'SHA-512'

  static async verifyInvite({
    b64PublicKey,
    dataBuffer,
    signatureBuffer,
  }: {
    b64PublicKey: string
    dataBuffer: ArrayBuffer
    signatureBuffer: ArrayBuffer
  }): Promise<Boolean> {
    const publicKey = await crypto.subtle.importKey(
      'spki',
      decode(b64PublicKey),
      {
        name: this.signatureAlgorithm,
        hash: this.hashAlgorithm,
      },
      false,
      ['verify'],
    )

    return crypto.subtle.verify(
      {
        name: this.signatureAlgorithm,
        saltLength: 128,
      },
      publicKey,
      signatureBuffer,
      dataBuffer,
    )
  }
}

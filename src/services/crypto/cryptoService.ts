import crypto from 'crypto'
import { decode } from 'base64-arraybuffer'

export class CryptoService {
  static verify({
    b64PublicKey,
    dataBuffer,
    signatureBuffer,
  }: {
    b64PublicKey: string
    dataBuffer: ArrayBuffer
    signatureBuffer: ArrayBuffer
  }) {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(decode(b64PublicKey)),
      format: 'der',
      type: 'spki',
    })

    return crypto.verify(
      'rsa-sha512',
      Buffer.from(dataBuffer),
      {
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 64,
        // @ts-ignore
        key: publicKey,
      },
      Buffer.from(signatureBuffer),
    )
  }
}

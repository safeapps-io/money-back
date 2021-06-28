import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken'
import { createCipheriv, createDecipheriv } from 'crypto'

export const signJwt = (data: object, options?: SignOptions): Promise<string> =>
  new Promise<string>((resolve) => {
    jwt.sign(data, process.env.SECRET as string, options || {}, (_, encoded) =>
      resolve(encoded as string),
    )
  })

export function verifyJwt<T extends object>(token: string, options?: VerifyOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRET as string, options, (err, decoded) => {
      if (err) reject(err)
      resolve(decoded as T)
    })
  })
}

const secret = process.env.SECRET as string,
  algo = 'aes-256-cbc',
  keyBuffer = Buffer.from(secret.slice(0, 32)),
  iv = Buffer.from(secret.slice(0, 16))

export function encryptAes(data: object) {
  const cipher = createCipheriv(algo, keyBuffer, iv)

  let encrypted = cipher.update(JSON.stringify(data))
  encrypted = Buffer.concat([encrypted, cipher.final()])

  return encrypted.toString('hex')
}

export function decryptAes<T>(encr: string) {
  const encryptedText = Buffer.from(encr, 'hex'),
    decipher = createDecipheriv(algo, keyBuffer, iv)

  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return JSON.parse(decrypted.toString()) as T
}

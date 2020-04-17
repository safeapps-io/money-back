import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken'

export const signJwt = (data: object, options?: SignOptions): Promise<string> =>
  new Promise(resolve => {
    jwt.sign(data, process.env.SECRET as string, options || {}, (_, encoded) =>
      resolve(encoded),
    )
  })

export function verifyJwt<T extends object>(
  token: string,
  options?: VerifyOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRET as string, options, (err, decoded) => {
      if (err) reject(err)
      resolve(decoded as T)
    })
  })
}

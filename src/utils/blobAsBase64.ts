import { encode, decode } from 'base64-arraybuffer'

export const getValue = (dbRawValue: Buffer | ArrayBuffer | string | null) => {
  if (dbRawValue === null || typeof dbRawValue === 'string') return dbRawValue
  return encode(dbRawValue)
}

export const setValue = (
  newVal: string | Buffer,
  setter: (val: Buffer | null) => void,
) => {
  if (typeof newVal === 'string') return setter(Buffer.from(decode(newVal)))
  setter(newVal)
}

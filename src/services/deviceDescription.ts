import { UAParser } from 'ua-parser-js'

export const getDeviceDescription = (userAgent: string) => {
  const parsed = new UAParser(userAgent),
    os = parsed.getOS(),
    browser = parsed.getBrowser()

  return (
    `${getNameAndVersion(os)} ${getNameAndVersion(browser)}`.trim() ||
    'Unknown device'
  )
}

const getNameAndVersion = (obj: { name?: string; version?: string }) => {
  let res = ''
  if (obj.name) {
    res += obj.name
    if (obj.version) res += ` ${obj.version}`
  }
  return res
}

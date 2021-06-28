import { UAParser } from 'ua-parser-js'

export const getDeviceDescription = (userAgent: string) => {
  const parsed = new UAParser(userAgent),
    os = parsed.getOS(),
    browser = parsed.getBrowser()

  return `${getNameAndVersion(os)} ${getNameAndVersion(browser)}`.trim() || 'Unknown device'
}

const getNameAndVersion = (obj: { name?: string; version?: string }) =>
  (obj?.name + ` ${obj?.version}`).trim()

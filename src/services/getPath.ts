const port = process.env.NODE_ENV === 'development' ? `:${process.env.SITE_PORT}` : ''

export const getFullPath = (args?: { path: string; includeHost?: boolean }) => {
  const { path = '', includeHost = true } = args || {}
  let result = ''

  if (includeHost) result += `${process.env.SITE_SCHEME}://${process.env.SITE_HOST}${port}`

  result += `${path}`

  return result
}

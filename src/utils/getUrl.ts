const port =
  process.env.NODE_ENV === 'development' ? `:${process.env.PORT}` : ''

/**
 * Will return '{scheme}://{host}:{port}/${path}' for dev and '{scheme}://{host}/${path}' for production
 *
 * @param args.path         Path to file
 * @param args.includeHost  Includes scheme, host and port to the URL. True by default, because it definitely will return a valid path
 *                          for all environments
 */
const getFullPath = (args?: { path: string; includeHost?: boolean }) => {
  const { path = '', includeHost = true } = args || {}
  let result = ''

  if (includeHost)
    result += `${process.env.SCHEME}://${process.env.HOST}${port}`

  result += `${path}`

  return result
}

export default getFullPath

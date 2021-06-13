const cookieKey = 'source'

export const sourceMiddleware: Handler = (req, res, next) => {
  let source: { [param: string]: string } | null = null
  try {
    source = JSON.parse(req.cookies[cookieKey])
  } catch (error) {}
  req.userSource = source
  next()

  res.cookie(cookieKey, '', { maxAge: 0 })
}

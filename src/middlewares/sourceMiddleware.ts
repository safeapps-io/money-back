const cookieKey = 'source'

export const sourceMiddleware: Handler = (req, res, next) => {
  let source: { [param: string]: string } | null = null
  try {
    source = JSON.parse(req.cookies[cookieKey])
  } catch (error) {}
  req.userSource = source
  next()

  // It is practically useless as subdomain cannot unset cookies from root
  // res.cookie(cookieKey, '', { maxAge: 0 })
}

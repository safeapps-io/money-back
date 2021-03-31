import fetch, { Request, Response } from 'node-fetch'

export const request = async <Res = {}>({
  method = 'GET',
  path = '',
  data = {},
}: {
  method: 'GET' | 'POST'
  path: string
  data: Object
}) => {
  const body = method === 'GET' ? undefined : JSON.stringify(data),
    req = new Request(path, {
      method,
      body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })

  let res: Response, json: Res
  try {
    res = await fetch(req)
    json = await res.json()
  } catch (e) {
    throw new Error(e.message)
  }

  return { json, res }
}

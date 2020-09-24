import app from './app'

const scheme = process.env.SERVER_SCHEME as string,
  host = process.env.SERVER_HOST as string,
  port = parseInt(process.env.SERVER_PORT as string)

if (!port) throw new Error('Create .env file with PORT variable!')

const main = async () => {
  ;(await app).listen(port, host)
  console.log(`Listening on ${scheme}://${host}:${port}/`)
}

main()

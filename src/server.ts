import app from './app'

const port = parseInt(process.env.PORT as string)
const host = process.env.SERVER_IP as string

if (!port) throw new Error('Create .env file with PORT variable!')

const main = async () => {
  ;(await app).listen(port, host)
  console.log(`Listening on http://${host}:${port}/`)
}

main()

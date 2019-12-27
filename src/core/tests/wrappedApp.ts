import app from '@/app'
import request from 'supertest'

const getTestApp = async () => request(await app)

export default getTestApp()

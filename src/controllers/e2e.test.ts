import request from 'supertest'
import nanoid from 'nanoid'

import appPromise from '@/app'

describe('Error reporting', () => {
  it('reports error for user endpoint', async done => {
    const app = request(await appPromise)

    app
      .get('/saviour/api/auth/user')
      .expect(400, { code: 403, message: 'Invalid token' })
      .end(function(err) {
        if (err) return done(err)
        done()
      })
  })

  it('reports error for signup', async done => {
    const app = request(await appPromise)

    app
      .post('/saviour/api/auth/signup')
      .expect(400, {
        code: 400,
        message: 'error',
        fieldErrors: {
          username: ['username is a required field'],
          password: ['password is a required field'],
        },
      })
      .end(function(err) {
        if (err) return done(err)
        done()
      })
  })

  it('lets you signup', async done => {
    const app = request(await appPromise),
      username = nanoid()

    app
      .post('/saviour/api/auth/signup')
      .send({ username, password: nanoid() })
      .end(function(err, res) {
        expect(res.status).toBe(200)
        expect(res.body.user.username).toBe(username)
        done()
      })
  })
})

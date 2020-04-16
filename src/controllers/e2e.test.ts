import request from 'supertest'
import nanoid from 'nanoid'

import appPromise from '@/app'
import { UserServiceFormErrors } from '@/services/user'

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

  it('throws if email or username is occupied', async done => {
    const app = request(await appPromise),
      username = nanoid(),
      email = `${nanoid()}@test.com`,
      password = nanoid()

    app
      .post('/saviour/api/auth/signup')
      .send({ username, password, email })
      .end((_, res) => {
        expect(res.status).toBe(200)
        app
          .post('/saviour/api/auth/signup')
          .send({ username: 'other-username', password, email })
          .end((_, res) => {
            expect(res.status).toBe(400)
            expect(res.body.message).toBe(UserServiceFormErrors.emailTaken)

            app
              .post('/saviour/api/auth/signup')
              .send({ username, password, email: 'otherEmail@test.com' })
              .end((_, res) => {
                expect(res.status).toBe(400)
                expect(res.body.message).toBe(
                  UserServiceFormErrors.usernameTaken,
                )

                done()
              })
          })
      })
  })

  it('lets you update user data', async done => {
    const app = request(await appPromise),
      username = nanoid(),
      email = `${nanoid()}@test.com`,
      password = nanoid()

    app
      .post('/saviour/api/auth/signup')
      .send({ username, password, email })
      .end((_, res) => {
        app
          .post('/saviour/api/auth/updateUser')
          .set('authorization', res.body.token)
          .send({ username, email: `${nanoid()}@test.com` })
          .end((_, res) => {
            expect(res.status).toBe(200)
            done()
          })
      })
  })
})

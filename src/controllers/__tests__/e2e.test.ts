import request from 'supertest'
import { nanoid } from 'nanoid'

import appPromise from '@/app'
import { UserServiceFormErrors } from '@/services/user/userService'
import testData from '@/services/crypto/testData.json'
import User from '@/models/user.model'

describe('Error reporting', () => {
  // It is hardcoded against user dkzlv and his ID
  const invite = testData.users.dkzlv.signedInvite,
    inviteId = 'NRhATmZbAYZ2O1jMlE0pB'

  beforeEach(() => User.destroy({ where: { inviteId } }))

  it('reports error for user endpoint', async (done) => {
    const app = request(await appPromise)

    app.get('/saviour/api/auth/user').end(function (_, res) {
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ code: 403, message: 'Invalid token' })

      done()
    })
  })

  it('reports error for signup', async (done) => {
    const app = request(await appPromise)

    app
      .post('/saviour/api/auth/signup')
      .expect(400, {
        code: 400,
        message: 'error',
        fieldErrors: {
          username: ['username is a required field'],
          password: ['password is a required field'],
          invite: ['invite is a required field'],
        },
      })
      .end(function (err) {
        if (err) return done(err)
        done()
      })
  })

  it.only('lets you signup', async (done) => {
    const app = request(await appPromise),
      username = nanoid()

    app
      .post('/saviour/api/auth/signup')
      .send({ username, password: nanoid(), invite })
      .end(function (_, res) {
        expect(res.status).toBe(200)
        expect(res.body.user.username).toBe(username)
        done()
      })
  })

  it('throws if email or username is occupied', async (done) => {
    const app = request(await appPromise),
      email = `${nanoid()}@test.com`,
      password = nanoid()

    app
      .post('/saviour/api/auth/signup')
      .send({ username: 'dkzlv', password, email, invite })
      .end((_, res) => {
        expect(res.status).toBe(400)
        expect(res.body.message).toBe(UserServiceFormErrors.usernameTaken)
        done()
      })
  })

  it('lets you update user data', async (done) => {
    const app = request(await appPromise),
      username = nanoid(),
      email = `${nanoid()}@test.com`,
      password = nanoid()

    app
      .post('/saviour/api/auth/signup')
      .send({ username, password, email, invite })
      .end((_, res) => {
        app
          .post('/saviour/api/auth/updateUser')
          .set('authorization', res.body.accessToken)
          .send({ username, email: `${nanoid()}@test.com` })
          .end((_, res) => {
            expect(res.status).toBe(200)
            done()
          })
      })
  })
})

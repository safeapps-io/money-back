import itPatched from '@/core/tests/itPatched'

describe('Basic checks', () => {
  itPatched('Endpoint works', async app => {
    await app
      .get('/api/itWorks')
      .expect('Content-Type', /application\/json/)
      .expect(200)
  })

  itPatched('Endpoint returns error in a beautiful manner', async app => {
    const res = await app.post('/api/itWorks').expect(400)
    expect(res.body.code).toBe(1000)
    expect(res.body.message).toBe('Error text')
  })
})

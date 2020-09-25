'use strict'

const nanoid = require('nanoid').nanoid,
  _ = require('lodash'),
  argon2 = require('argon2'),
  dateFns = require('date-fns'),
  testData = require('../../services/crypto/testData.json')

function randomDateBetween(start, end) {
  return new Date(_.random(start.getTime(), end.getTime()))
}

const endDate = new Date(),
  startDate = dateFns.sub(endDate, { months: 12 })

const buildBase = () => {
  const created = randomDateBetween(
      startDate,
      dateFns.sub(endDate, { days: 1 }),
    ),
    updated = randomDateBetween(created, endDate)
  return {
    id: nanoid(),
    created,
    updated,
  }
}

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Users', [
      {
        ...buildBase(),
        id: testData.users.dkzlv.id,
        username: 'dkzlv',
        email: 'dkzlv@safeapps.io',
        password: await argon2.hash('qwerty123456'),
        inviteMonthlyLimit: 100000,
        b64InvitePublicKey: testData.users.dkzlv.b64InvitePublicKey,
      },
    ])
  },
}
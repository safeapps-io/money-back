'use strict'

const nanoid = require('nanoid').nanoid,
  _ = require('lodash'),
  faker = require('faker'),
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
        isAdmin: true,
        email: 'dkzlv@safeapps.io',
        password: await argon2.hash('qwerty123456'),
        inviteMonthlyLimit: 100000,
        b64InvitePublicKey: testData.users.dkzlv.b64InvitePublicKey,
      },
      {
        ...buildBase(),
        username: 'ama',
        email: 'ama@safeapps.io',
        password: await argon2.hash('qwerty123456'),
        inviteMonthlyLimit: 100000,
        b64InvitePublicKey: testData.users.dkzlv.b64InvitePublicKey,
      },
    ])

    await queryInterface.bulkInsert(
      'MetaCategories',
      _.range(25).map(() => ({
        ...buildBase(),
        published: Math.random() >= 0.3,
        isIncome: Math.random() >= 0.7,
        name: faker.commerce.department(),
        color: faker.commerce.color(),
        assignedMcc: '[]',
      })),
    )

    const productInfo = buildBase()

    await queryInterface.bulkInsert('Products', [
      {
        ...productInfo,
        slug: 'first',
        productType: 'money',
        description: 'First product to buy',
        default: true,
        price: 5999,
      },
    ])

    const planInfo = buildBase(),
      expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30)

    await queryInterface.bulkInsert('Plans', [
      {
        ...planInfo,
        productId: productInfo.id,
        userId: testData.users.dkzlv.id,
        expires,
      },
    ])

    await queryInterface.bulkInsert('ChargeEvents', [
      {
        ...buildBase(),
        eventType: 'confirmed',
        chargeType: 'trial',
        expiredNew: expires,
        planId: planInfo.id,
        productId: productInfo.id,
        rawData: '[]',
      },
    ])
  },
}

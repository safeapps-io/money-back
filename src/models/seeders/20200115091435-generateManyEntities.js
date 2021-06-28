'use strict'

const nanoid = require('nanoid').nanoid,
  _ = require('lodash'),
  argon2 = require('argon2'),
  faker = require('faker'),
  dateFns = require('date-fns'),
  { Crypto } = require('@peculiar/webcrypto'),
  cryptoOld = new Crypto(),
  { decode } = require('base64-arraybuffer'),
  testData = require('../../services/crypto/testData.json')

function randomDateBetween(start, end) {
  return new Date(_.random(start.getTime(), end.getTime()))
}

const encrAlgo = 'AES-GCM',
  hash = (string) => cryptoOld.subtle.digest('SHA-512', Buffer.from(string)),
  encrypt = async (id, walletId, dataObj, key) => {
    const [hash1, hash2] = await Promise.all([hash(id), hash(walletId)])
    return cryptoOld.subtle.encrypt(
      {
        name: encrAlgo,
        iv: Buffer.concat([Buffer.from(hash1), Buffer.from(hash2)]),
      },
      key,
      Buffer.from(JSON.stringify(dataObj)),
    )
  }

const EntityTypes = {
  wallet: 'w',

  asset: 'a',

  walletUser: 'wu',
  category: 'c',
  searchFilter: 'sf',

  balanceCorrectionTransaction: 'bct',
  balanceReferenceTransaction: 'brt',

  transaction: 't',
  ignoredTransaction: 'it',

  deleted: 'd',
}

const endDate = new Date(),
  startDate = dateFns.sub(endDate, { months: 12 })

// prettier-ignore
const tagsChoices = ['Отпуск', 'MetPet', 'Семья', 'CleverPay', 'Privacy', 'tag1', 'hey hey hey', 'GO FOR IT', 'SEND NUDES'],
  mccChoices = ['0742', '0763', '0780', '1740', '1761', '1799', '3000', '3193', '3423', '3733', '5912', '7941', '9402']

const buildBase = () => {
    const created = randomDateBetween(startDate, dateFns.sub(endDate, { days: 1 })),
      updated = randomDateBetween(created, endDate)
    return {
      id: nanoid(),
      created,
      updated,
    }
  },
  buildBaseEntity = (walletId) => {
    const base = buildBase()
    return { ...base, walletId }
  }

module.exports = {
  up: async (queryInterface) => {
    const encryptionKey = await cryptoOld.subtle.importKey(
        'raw',
        decode(testData.exportedEncryptionKey),
        encrAlgo,
        false,
        ['encrypt'],
      ),
      pass = await argon2.hash('qwerty123456'),
      dkzlvData = {
        id: testData.users.dkzlv.id,
        username: 'dkzlv',
        password: pass,
        b64salt: Buffer.from(decode(testData.users.dkzlv.b64salt)),
        b64EncryptedInvitePrivateKey: Buffer.from(
          decode(testData.users.dkzlv.b64EncryptedInvitePrivateKey),
        ),
        b64InvitePublicKey: Buffer.from(decode(testData.users.dkzlv.b64InvitePublicKey)),
        inviteMonthlyLimit: 100000,
      },
      dkzlvChest = Buffer.from(decode(testData.users.dkzlv.chest)),
      amaData = {
        id: testData.users.ama.id,
        username: 'ama',
        password: pass,
        inviterId: dkzlvData.id,
        b64salt: Buffer.from(decode(testData.users.ama.b64salt)),
        b64EncryptedInvitePrivateKey: Buffer.from(
          decode(testData.users.ama.b64EncryptedInvitePrivateKey),
        ),
        b64InvitePublicKey: Buffer.from(decode(testData.users.ama.b64InvitePublicKey)),
      },
      amaChest = Buffer.from(decode(testData.users.ama.chest)),
      users = [dkzlvData, amaData]
    await queryInterface.bulkInsert(
      'Users',
      users.map((d) => ({
        ...buildBase(),
        ...d,
      })),
    )

    const wallets = _.range(5).map(buildBase),
      walletIdChoices = wallets.map((w) => w.id)

    await queryInterface.bulkInsert('Wallets', wallets)

    const walletAccesses = walletIdChoices.flatMap((walletId) =>
      users.map((user) => ({
        ...buildBase(),
        userId: user.id,
        walletId,
        chest: user.id === dkzlvData.id ? dkzlvChest : amaChest,
        accessLevel: user.id === dkzlvData.id ? 'owner' : 'usual',
      })),
    )

    await queryInterface.bulkInsert('WalletAccesses', walletAccesses)

    // Base entity with decr: `{}`.
    // Gonna transform it to `{ decr: undefined, encr: ArrayBuffer }` later.
    const entitiesDecr = []
    for (const walletId of walletIdChoices) {
      const categories = _.range(50).map(() => ({
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.category,
            name: faker.commerce.department(),
            color: faker.internet.color(),
            isIncome: Math.random() < 0.1,
          },
        })),
        incomeCategoryId = categories.filter((cat) => cat.decr.isIncome).map((cat) => cat.id),
        expenseCategoryId = categories.filter((cat) => !cat.decr.isIncome).map((cat) => cat.id)

      const walletData = {
        ...buildBaseEntity(walletId),
        decr: {
          type: EntityTypes.wallet,
          name: faker.commerce.department(),

          balance: true,
        },
      }

      const asset = {
        ...buildBaseEntity(walletId),
        decr: {
          type: EntityTypes.asset,

          code: _.sample(['USD', 'RUB', 'EUR']),
        },
      }

      const walletUsers = users.map((user) => ({
        ...buildBaseEntity(walletId),
        decr: {
          type: EntityTypes.walletUser,
          userId: user.id,
          name: user.username,
        },
      }))

      const searchFilters = [
        {
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.searchFilter,
            name: '',
            protected: true,
            group: 'all',
            balance: true,

            parameters: {
              category: { oneOf: [], noneOf: [] },
              tag: { oneOf: [], noneOf: [] },
            },
          },
        },
        {
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.searchFilter,
            name: 'По месяцу, без 3 тегов',
            group: 'month',
            protected: false,

            parameters: {
              category: { oneOf: [], noneOf: [] },
              tag: { oneOf: [], noneOf: _.sampleSize(tagsChoices, 3) },
            },
          },
        },
      ]

      const userIdChoices = walletUsers.map((wu) => wu.id)

      const correctionTeansactions = _.range(10).map(() => ({
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.balanceCorrectionTransaction,
            datetime: randomDateBetween(
              dateFns.sub(new Date(), { years: 1 }),
              new Date(),
            ).getTime(),
            walletUserId: _.sample(userIdChoices),
            assetId: asset.id,
            amount: _.random(-5000, 5000),
          },
        })),
        referenceTransactions = _.range(3).map((i) => ({
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.balanceReferenceTransaction,
            isActive: i === 0,
            amount: _.random(500000, 1000000),
            assetId: asset.id,

            datetime: randomDateBetween(
              dateFns.sub(new Date(), { years: 1 }),
              new Date(),
            ).getTime(),
          },
        }))

      const transactions = _.range(_.random(500, 600)).map(() => {
        const decr = {
          type: EntityTypes.transaction,
          isIncome: Math.random() < 0.05,
          walletUserId: _.sample(userIdChoices),
          assetId: asset.id,
          datetime: randomDateBetween(dateFns.sub(new Date(), { years: 1 }), new Date()).getTime(),
          description: Math.random() < 0.1 ? faker.commerce.productName() : null,
          autocomplete: {},
        }

        if (decr.isIncome) {
          decr.amount = _.random(20000, 100000)
          decr.categoryId = _.sample(incomeCategoryId)
        } else {
          decr.amount = _.random(-5000, -50)
          decr.categoryId = _.sample(expenseCategoryId)
          if (Math.random() < 0.1) {
            decr.originalAmount = _.random(-100, -1)
            let curr
            while (!curr || curr.split(' ').length === 2) curr = faker.finance.currencyCode()

            decr.currency = curr
          }
          if (Math.random() < 0.8) {
            decr.autocomplete.mcc = _.sample(mccChoices)
            decr.autocomplete.accNumber = _.random(2500, 9000).toString()
            decr.autocomplete.merchant = faker.company.companyName()
          }
        }
        decr.isDraft = Math.random() < 0.01
        decr.tags =
          Math.random() < 0.4 ? [Array(_.random(1, 3)).keys()].map(() => _.sample(tagsChoices)) : []

        return { ...buildBaseEntity(walletId), decr }
      })

      entitiesDecr.push(
        walletData,
        asset,
        ...categories,
        ...searchFilters,
        ...walletUsers,
        ...correctionTeansactions,
        ...referenceTransactions,
        ...transactions,
      )
    }

    const encrypted = await Promise.all(
        entitiesDecr.map((ent) => encrypt(ent.id, ent.walletId, ent.decr, encryptionKey)),
      ),
      toSave = entitiesDecr.map((ent, i) => ({
        ...ent,
        decr: undefined,
        encr: Buffer.from(encrypted[i]),
      }))

    toSave.forEach((e) => delete e.decr)

    return queryInterface.bulkInsert('Entities', toSave)
  },
}

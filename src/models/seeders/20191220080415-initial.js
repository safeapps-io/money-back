'use strict'

const key = '9dJFMZADdoYhJ8E2SUxC0KLW2qYW3EaOyv6'

const trId1 = '6hVbgZBREFjdSJ1vuY4YT'
const catId = 'EaIYQnjW5o-twjHhriSsF'

const updated = new Date(2019, 1, 1, 1, 1, 1)

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.bulkInsert(
        'Accesses',
        [
          {
            id: '1',
            created: new Date(),
            updated: new Date(),
            key,
          },
        ],
        {},
      )

      await queryInterface.bulkInsert('Categories', [
        {
          id: catId,
          created: new Date(),
          updated,
          title: 'Test category',
          color: '#123456',
          isIncome: false,
        },
      ])

      return queryInterface.bulkInsert('Transactions', [
        {
          id: trId1,
          created: new Date(),
          updated,
          amount: '12.21',
          isIncome: false,
          datetime: new Date(2019, 1, 2),
          owner: 'Dan',
          isDraft: false,
          tags: JSON.stringify([]),
          categoryId: catId,
          autocompleteData: JSON.stringify({}),
        },
      ])
    } catch (e) {
      console.error(e)
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Accesses', { where: { id: '1' } })
    await queryInterface.bulkDelete('Categories', { where: { id: catId } })
    return queryInterface.bulkDelete('Transactions', { where: { id: trId1 } })
  },
}

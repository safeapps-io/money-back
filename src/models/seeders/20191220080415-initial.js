'use strict'

const key = ''

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      'Accesses',
      [
        {
          id: 1,
          created: new Date(),
          updated: new Date(),
          key,
        },
      ],
      {},
    ),
  down: (queryInterface, Sequelize) =>
    queryInterface.bulkDelete('Accesses', { where: { key } }),
}

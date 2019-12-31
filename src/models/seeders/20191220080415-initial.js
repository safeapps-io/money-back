'use strict'

const key = '9dJFMZADdoYhJ8E2SUxC0KLW2qYW3EaOyv6'

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

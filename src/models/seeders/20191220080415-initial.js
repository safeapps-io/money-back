'use strict'

const username = 'dkzlv'

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.bulkInsert(
      'Users',
      [
        {
          id: 1,
          created: new Date(),
          updated: new Date(),
          birthday: new Date(1993, 1, 1),
          type: 2,
          username,
        },
      ],
      {},
    ),
  down: (queryInterface, Sequelize) =>
    queryInterface.bulkDelete('Users', { where: { username } }),
}

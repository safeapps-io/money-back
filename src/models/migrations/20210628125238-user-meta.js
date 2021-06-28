'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'source')

    return queryInterface.addColumn('Users', 'meta', {
      type: Sequelize.JSON,
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {},
}

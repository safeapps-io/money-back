'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'source', {
      type: Sequelize.JSON,
      allowNull: true,
    })
  },

  down: (queryInterface, Sequelize) => {},
}

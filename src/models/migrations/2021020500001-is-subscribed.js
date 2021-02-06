'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'isSubscribed', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    })
  },

  down: (queryInterface, Sequelize) => {},
}

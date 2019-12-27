'use strict'

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('Accesses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      created: Sequelize.DATE,
      updated: Sequelize.DATE,
      key: { type: Sequelize.STRING, allowNull: false },
    }),
}

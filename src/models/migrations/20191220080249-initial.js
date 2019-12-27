'use strict'

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      created: Sequelize.DATE,
      updated: Sequelize.DATE,
      username: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.INTEGER, allowNull: false },
      birthday: Sequelize.DATE,
    }),
}

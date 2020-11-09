'use strict'

const nanoid = require('nanoid').nanoid

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const requiredDate = { type: Sequelize.DATE, allowNull: false },
      requiredString = { type: Sequelize.STRING, allowNull: false }

    const baseModel = {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING,
        defaultValue: nanoid,
      },
      created: requiredDate,
      updated: requiredDate,
    }

    return queryInterface.createTable('MetaCategories', {
      ...baseModel,
      published: { type: Sequelize.BOOLEAN, allowNull: true },
      isIncome: { type: Sequelize.BOOLEAN, allowNull: true },
      name: requiredString,
      color: requiredString,
      assignedMcc: { type: Sequelize.JSON },
    })
  },

  down: (queryInterface, Sequelize) => {},
}

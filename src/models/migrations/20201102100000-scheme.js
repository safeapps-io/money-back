'use strict'

const nanoid = require('nanoid').nanoid

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const requiredDate = { type: Sequelize.DATE, allowNull: false },
      requiredString = { type: Sequelize.STRING, allowNull: false },
      optionalString = { type: Sequelize.STRING, allowNull: true }

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

    return queryInterface.createTable('Schemes', {
      ...baseModel,
      title: requiredString,
      published: { type: Sequelize.BOOLEAN, allowNull: true },
      encoding: requiredString,
      header: { type: Sequelize.BOOLEAN, allowNull: true },
      decimalDelimiterChar: requiredString,
      transformDateFormat: requiredString,
      fieldnameMap: { type: Sequelize.JSON },
      delimiter: optionalString,
      newline: optionalString,
      quoteChar: optionalString,
      escapeChar: optionalString,
    })
  },

  down: (queryInterface, Sequelize) => {},
}

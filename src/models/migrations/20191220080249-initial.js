'use strict'

const nanoid = require('nanoid')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const requiredString = { type: Sequelize.STRING, allowNull: false }
    const requiredDate = { type: Sequelize.DATE, allowNull: false }

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

    await queryInterface.createTable('Accesses', {
      ...baseModel,
      key: requiredString,
    })

    await queryInterface.createTable('Categories', {
      ...baseModel,
      title: requiredString,
      color: requiredString,
      isIncome: { type: Sequelize.BOOLEAN, allowNull: false },
    })

    await queryInterface.createTable('SearchFilters', {
      ...baseModel,
      title: requiredString,
      query: { type: Sequelize.STRING(2048), allowNull: false },
    })

    return queryInterface.createTable('Transactions', {
      ...baseModel,
      amount: { type: Sequelize.DECIMAL, allowNull: false },
      originalAmount: Sequelize.DECIMAL,
      currency: Sequelize.STRING,
      description: Sequelize.STRING,
      mcc: Sequelize.NUMBER,
      datetime: requiredDate,
      owner: requiredString,
      categoryId: {
        type: Sequelize.STRING,
        references: {
          model: 'Categories',
          key: 'id',
        },
        allowNull: false,
      },
      tags: { type: Sequelize.JSON, allowNull: false },
    })
  },
}

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
      parameters: { type: Sequelize.JSON, allowNull: false },
      balanceType: { type: Sequelize.STRING, allowNull: true },
      sharedBalanceSearchFilterId: {
        type: Sequelize.STRING,
        references: {
          model: 'SearchFilters',
          key: 'id',
        },
        allowNull: true,
      },
    })

    return queryInterface.createTable('Transactions', {
      ...baseModel,
      type: requiredString,
      isActiveReference: Sequelize.BOOLEAN,
      amount: { type: Sequelize.DECIMAL, allowNull: false },
      isIncome: { type: Sequelize.BOOLEAN, allowNull: false },
      originalAmount: Sequelize.DECIMAL,
      currency: Sequelize.STRING,
      description: Sequelize.STRING,
      autocompleteData: Sequelize.JSON,
      datetime: requiredDate,
      owner: Sequelize.STRING,
      categoryId: {
        type: Sequelize.STRING,
        references: {
          model: 'Categories',
          key: 'id',
        },
        allowNull: true,
      },
      tags: Sequelize.JSON,
      isDraft: Sequelize.BOOLEAN,
    })
  },
}

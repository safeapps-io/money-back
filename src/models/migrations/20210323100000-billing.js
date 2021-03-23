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

    await queryInterface.createTable('Products', {
      ...baseModel,
      slug: { ...requiredString, unique: true },
      productType: { allowNull: false, type: Sequelize.ENUM('money') },
      default: { type: Sequelize.BOOLEAN },
      active: { type: Sequelize.BOOLEAN },
      price: { allowNull: false, type: Sequelize.INTEGER },
      duration: { allowNull: false, type: Sequelize.INTEGER },
    })

    await queryInterface.createTable('Subscriptions', {
      ...baseModel,
      productId: {
        ...requiredString,
        references: {
          model: 'Products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        ...optionalString,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      expires: requiredDate,
    })

    return queryInterface.createTable('Transactions', {
      ...baseModel,
      type: {
        allowNull: false,
        type: Sequelize.ENUM('purchase', 'viral', 'manual'),
      },
      expiredOld: { type: Sequelize.DATE, allowNull: true },
      expiredNew: requiredDate,
      subscriptionId: {
        ...requiredString,
        references: {
          model: 'Subscriptions',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      productId: {
        ...optionalString,
        references: {
          model: 'Products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      remoteTransactionId: requiredString,
      events: { type: Sequelize.JSON },
    })
  },

  down: (queryInterface, Sequelize) => {},
}

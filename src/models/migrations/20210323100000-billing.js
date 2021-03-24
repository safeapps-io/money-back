'use strict'

const nanoid = require('nanoid').nanoid

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const requiredDate = { type: Sequelize.DATE, allowNull: false },
      optionalDate = { type: Sequelize.DATE, allowNull: true },
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
      description: requiredString,
      default: { type: Sequelize.BOOLEAN, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      price: { allowNull: false, type: Sequelize.INTEGER },
      duration: { allowNull: false, type: Sequelize.INTEGER, defaultValue: 12 },
    })

    await queryInterface.createTable('Plans', {
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
      expires: optionalDate,
      automaticCharge: { type: Sequelize.BOOLEAN, defaultValue: false },
    })

    return queryInterface.createTable('ChargeEvents', {
      ...baseModel,
      eventType: {
        allowNull: false,
        type: Sequelize.ENUM(
          'created',
          'pending',
          'confirmed',
          'failed',
          'refunded',
        ),
      },
      chargeType: {
        allowNull: false,
        type: Sequelize.ENUM('trial', 'purchase', 'viral', 'manual'),
      },
      provider: {
        allowNull: true,
        type: Sequelize.ENUM('coinbase', 'tinkoff'),
      },
      expiredOld: optionalDate,
      expiredNew: requiredDate,
      productId: {
        ...optionalString,
        references: {
          model: 'Products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      planId: {
        ...requiredString,
        references: {
          model: 'Plans',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      remoteChargeId: optionalString,
      rawData: { type: Sequelize.JSON },
    })
  },

  down: (queryInterface, Sequelize) => {},
}

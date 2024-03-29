'use strict'

const nanoid = require('nanoid').nanoid

module.exports = {
  up: async (queryInterface, Sequelize) => {
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

    await queryInterface.createTable('Wallets', baseModel)

    await queryInterface.createTable('Entities', {
      ...baseModel,
      walletId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Wallets',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      encr: { type: Sequelize.BLOB, allowNull: false },
    })

    return queryInterface.createTable('WalletAccesses', {
      ...baseModel,
      userId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      walletId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Wallets',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      chest: { type: Sequelize.BLOB, allowNull: true },
      inviteId: { type: Sequelize.STRING(32), allowNull: true },
      accessLevel: { type: Sequelize.STRING(16), allowNull: false },
    })
  },

  down: (queryInterface, Sequelize) => {},
}

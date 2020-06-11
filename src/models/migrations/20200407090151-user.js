'use strict'

const nanoid = require('nanoid').nanoid

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

    await queryInterface.dropTable('Accesses')

    await queryInterface.createTable('Users', {
      ...baseModel,
      username: { ...requiredString, unique: true },
      email: { type: Sequelize.STRING, allowNull: true, unique: true },
      b64InvitePublicKey: { type: Sequelize.BLOB, allowNull: true },
      b64EncryptedInvitePrivateKey: { type: Sequelize.BLOB, allowNull: true },
      b64salt: { type: Sequelize.BLOB, allowNull: true },
      encr: { type: Sequelize.BLOB, allowNull: true },
      password: requiredString,
      inviterId: {
        type: Sequelize.STRING,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    })

    return queryInterface.createTable('RefreshTokens', {
      ...baseModel,
      key: { ...requiredString, defaultValue: () => nanoid(50) },
      description: requiredString,
      userId: {
        ...requiredString,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    })
  },

  down: (queryInterface, Sequelize) => {},
}

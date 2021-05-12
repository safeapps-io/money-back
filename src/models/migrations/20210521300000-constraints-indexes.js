'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Entities', ['walletId'])
    await queryInterface.addIndex('RefreshTokens', ['userId'])
    await queryInterface.addIndex('WalletAccesses', ['userId', 'walletId'])
    await queryInterface.addIndex('Plans', ['userId'])
    await queryInterface.addIndex('ChargeEvents', ['planId'])
    await queryInterface.addConstraint('ChargeEvents', {
      type: 'UNIQUE',
      fields: ['remoteChargeId', 'eventType'],
    })
  },

  down: (queryInterface, Sequelize) => {},
}

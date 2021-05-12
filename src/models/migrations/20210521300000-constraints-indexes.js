'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addIndex('Entities', ['walletId']),
      queryInterface.addIndex('RefreshTokens', ['userId']),
      queryInterface.addIndex('WalletAccesses', ['userId', 'walletId']),
      queryInterface.addIndex('Plans', ['userId']),
      queryInterface.addIndex('ChargeEvents', ['planId']),

      queryInterface.addConstraint('ChargeEvents', {
        type: 'UNIQUE',
        fields: ['remoteChargeId', 'eventType'],
      }),
    ])
  },

  down: (queryInterface, Sequelize) => {},
}

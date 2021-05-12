'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addIndex('Entities', ['walletId']).catch(console.error)
    queryInterface.addIndex('RefreshTokens', ['userId']).catch(console.error)
    queryInterface
      .addIndex('WalletAccesses', ['userId', 'walletId'])
      .catch(console.error)
    queryInterface.addIndex('Plans', ['userId']).catch(console.error)
    queryInterface.addIndex('ChargeEvents', ['planId']).catch(console.error)
    return queryInterface
      .addConstraint('ChargeEvents', {
        type: 'UNIQUE',
        fields: ['remoteChargeId', 'eventType'],
      })
      .catch(console.error)
  },

  down: (queryInterface, Sequelize) => {},
}

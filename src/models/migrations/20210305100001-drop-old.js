'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('BalanceTransactions')
    await queryInterface.dropTable('Transactions')
    await queryInterface.dropTable('SearchFilters')
    return await queryInterface.dropTable('Categories')
  },

  down: (queryInterface, Sequelize) => {},
}

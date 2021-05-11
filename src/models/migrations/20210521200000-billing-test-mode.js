'use strict'

const nanoid = require('nanoid').nanoid

const buildBase = () => {
  const now = new Date()
  return {
    id: nanoid(),
    created: now,
    updated: now,
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Products', 'isTest', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    })

    await queryInterface.bulkInsert('Products', [
      {
        ...buildBase(),
        slug: 'money:test',
        internalDescription: 'Test subscription',
        title: '[safe] money subscription',
        description: '1 day of full service',
        productType: 'money',
        isTest: true,
        price: 1,
      },
    ])
  },

  down: (queryInterface, Sequelize) => {},
}

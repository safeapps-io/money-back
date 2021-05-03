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
    await queryInterface.sequelize.query(
      'update "Products" set "default" = false where "default" = true;',
    )
    const productType = 'money'
    await queryInterface.bulkInsert('Products', [
      {
        ...buildBase(),
        slug: 'money:default_no_trial',
        internalDescription: 'Main subscription',
        title: '[safe] money subscription',
        description: '1 year of full service',
        productType,
        default: true,
        price: 5999,
      },
      {
        ...buildBase(),
        slug: 'money:early_bird_no_trial',
        internalDescription: 'Early bird subscription (-15%)',
        title: '[safe] money Early bird subscription',
        description: '1 year of full service with 15% discount',
        productType,
        price: 5099,
      },
    ])
  },

  down: (queryInterface, Sequelize) => {},
}

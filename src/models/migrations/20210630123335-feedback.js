'use strict'

const nanoid = require('nanoid').nanoid

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const requiredString = { type: Sequelize.STRING, allowNull: false },
      optionalString = { type: Sequelize.STRING, allowNull: true }
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

    await queryInterface.createTable('Feedbacks', {
      ...baseModel,
      description: requiredString,
      email: optionalString,
      userId: {
        ...requiredString,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    })

    return queryInterface.addIndex('Feedbacks', ['email'])
  },

  down: async (queryInterface, Sequelize) => {},
}

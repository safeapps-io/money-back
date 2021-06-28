'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'source')

    await queryInterface.addColumn('Users', 'meta', {
      type: Sequelize.JSONB,
      allowNull: true,
    })

    return queryInterface.sequelize.query(`
      CREATE INDEX meta_tags_index
        ON "Users"
        USING gin ((meta->'tags') jsonb_path_ops);
      `)
  },

  down: async (queryInterface, Sequelize) => {},
}

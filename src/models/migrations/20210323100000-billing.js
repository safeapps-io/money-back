'use strict'

const nanoid = require('nanoid').nanoid,
  { addDays } = require('date-fns')

// const argon2 = require('argon2')

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
    const requiredDate = { type: Sequelize.DATE, allowNull: false },
      optionalDate = { type: Sequelize.DATE, allowNull: true },
      requiredString = { type: Sequelize.STRING, allowNull: false },
      optionalString = { type: Sequelize.STRING, allowNull: true }

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

    await queryInterface.createTable('Products', {
      ...baseModel,
      slug: { ...requiredString, unique: true },
      productType: { allowNull: false, type: Sequelize.ENUM('money') },
      internalDescription: requiredString,
      title: requiredString,
      description: requiredString,
      default: { type: Sequelize.BOOLEAN, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      price: { allowNull: false, type: Sequelize.INTEGER },
      duration: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 365,
      },
      trialDuration: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },
    })

    const commonProductData = {
      productType: 'money',
      trialDuration: 15,
    }

    const earlyProductData = buildBase()
    await queryInterface.bulkInsert('Products', [
      {
        ...buildBase(),
        ...commonProductData,
        slug: 'money:default',
        internalDescription: 'Main subscription',
        title: '[safe] money subscription',
        description: '1 year of full service',
        default: true,
        price: 5999,
      },
      {
        ...earlyProductData,
        ...commonProductData,
        slug: 'money:early_bird',
        internalDescription: 'Early bird subscription (-15%)',
        title: '[safe] money Early bird subscription',
        description: '1 year of full service with 15% discount',
        price: 5099,
      },
    ])

    await queryInterface.createTable('Plans', {
      ...baseModel,
      productId: {
        ...requiredString,
        references: {
          model: 'Products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        ...optionalString,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      expires: optionalDate,
      automaticCharge: { type: Sequelize.BOOLEAN, defaultValue: false },
    })

    await queryInterface.createTable('ChargeEvents', {
      ...baseModel,
      eventType: {
        allowNull: false,
        type: Sequelize.ENUM(
          'created',
          'pending',
          'confirmed',
          'failed',
          'refunded',
        ),
      },
      chargeType: {
        allowNull: false,
        type: Sequelize.ENUM('trial', 'purchase', 'viral', 'manual'),
      },
      provider: {
        allowNull: true,
        type: Sequelize.ENUM('coinbase', 'tinkoff'),
      },
      expiredOld: optionalDate,
      expiredNew: optionalDate,
      productId: {
        ...optionalString,
        references: {
          model: 'Products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      planId: {
        ...requiredString,
        references: {
          model: 'Plans',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      remoteChargeId: optionalString,
      rawData: { type: Sequelize.JSON },
    })

    // await queryInterface.bulkInsert('Users', [
    //   {
    //     ...buildBase(),
    //     username: '___test',
    //     password: await argon2.hash('qwerty123456'),
    //   },
    // ])

    const userIds = await queryInterface.sequelize.query(
      'SELECT * FROM "Users"',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    )

    const expires = addDays(new Date(), 15)
    const planObjs = userIds.map(({ id }) => ({
        ...buildBase(),
        productId: earlyProductData.id,
        expires,
        userId: id,
      })),
      chargesObjs = planObjs.map((plan) => ({
        ...buildBase(),
        eventType: 'confirmed',
        chargeType: 'trial',
        expiredNew: expires,
        productId: plan.productId,
        planId: plan.id,
        rawData: '{}',
      }))

    planObjs.length && (await queryInterface.bulkInsert('Plans', planObjs))
    chargesObjs.length &&
      (await queryInterface.bulkInsert('ChargeEvents', chargesObjs))
  },

  down: (queryInterface, Sequelize) => {},
}

'use strict'

const nanoid = require('nanoid')
const _ = require('lodash')
const faker = require('faker')

function randomDateBetween(start, end) {
  return new Date(_.random(start.getTime(), end.getTime()))
}

// prettier-ignore
const categoryIds = ["SSz9oeX8vgg8-SRX9DmTI","L6JTduqhfIOXR4msAUbkl","Z2gC_pVqcs4VFc4YLnQV1","K3HoKrd2TMEITG9QRGLP5","F5NH_CJ9lMCncIdjaNqq8","LrY1OOBR2R-fc6zUmhVvy","Lo2zkWqEUY99hG54v4dZd","md8jnQ9vg3zpF_49z7zKi","7zIraQX4-VreufkxyIlnq","bwaIjeWzkMLgG-1YZli4m","vR075ooj7anFONLZnokBq","G6rfVc8MhDyZGikxViOH4","zBsj47SZIG_EpO26pZC63","oEV-okmhhC-yR9Xlncjjo","qN3OxBIl55te-h6jFn-1y","vG6GE5nvOSCAH_wj2n_5Q","aUA1nJS-CT6o-m8Tv2NQK","kCO_WJSzFtp1FznZiZBSZ","XYJ3jRMC0APEMLhYqGvgf","ipF3Ayo_qv2dqy6idgb-f","XgrHIGrPV51Z_ClzzEgcb","Q9YAo9TMjiQES0PlIdt7I","wNllD1phz90KdTqcBU5wE","LD9HCchMyra_uqNVtV8ku","jfdwNe8uavdIlhLPTznRt","_-tQU92mDZ4ENDj2jK9Xt","jt8rvueP4EyGx8k4cedfL","iTpsvyqgoAJkrBg6qts1B","EiiNLK6psWM-9W4prRcxL","AU70ceLGgpoO29LGkAg-L","pD8R8zeCSX6ycMh3qXA2_","5mViysRI8WqZ5itiYqR1Q","X1KMUXti2iyhSQXQ4RF8N","YydV5scitkElWuPSLuvxz","ESewlhIcbGvJct3uk_fW_","Evl_5VtaKZpJ7FVAv5S76","PCHvEw11ldjZQi573CTGM","osdCeAGNWMDGllrRdWsHa","NglyHL1lTjGhJW9H-pLG7","Hv2ebD-5K11rQgFd9yMUI","kOkg5M5Kelu10fzu6Lt9r","p-AKTReGrVdMVCIFnGz6O","btfDL5X8ZGCniLkisKVuo","xInj06_KSpkCk-YxZdS1u","0CpfBUCE4b_-Ge3jliQyh","_gdareti2imSRIA1J5oom","wgNKyb5r4XC7kyTKim68K","qWrsW538ZFspqbmCx9sMn","E8_VP9FfXzW73Y3IrJ4Vs","B8q9vO-B_ND_07gfgGwk_"]

const searchFilterIds = [
  'BWJ2itKrDmoP3LzakdgmP',
  'gMP0ulcg6bMy0o4pE-im_',
  'd6mRdkTqgSPe_GO_MVILi',
]

const isIncomeToCategoryId = { income: [], expense: [] }

const endDate = new Date()
const startDate = new Date(endDate.getTime())
startDate.setMonth(endDate.getMonth() - 12)

const nameChoices = ['dkzlv', 'ama']
const tagsChoices = ['Отпуск', 'MetPet', 'Семья', 'CleverPay', 'Privacy']
// prettier-ignore
const mccChoices = ['0742', '0763', '0780', '1740', '1761', '1799', '3000', '3193', '3423', '3733', '5912', '7941', '9402']

const buildBaseTransaction = () => {
  const created = randomDateBetween(
    startDate,
    new Date(endDate.getTime() - 5000),
  )
  const updated = randomDateBetween(created, endDate)
  return {
    id: nanoid(),
    datetime: created,
    created,
    updated,
    autocompleteData: JSON.stringify({}),
    tags: JSON.stringify([]),
  }
}

const transactionBuilder = () => {
  const res = {
    ...buildBaseTransaction(),
    type: 'usual',
    isIncome: Math.random() < 0.05,
    isActiveReference: null,
    owner: _.sample(nameChoices),
    description: Math.random() < 0.1 ? faker.commerce.productName() : null,
  }

  if (res.isIncome) {
    res.amount = _.random(20000, 100000)
    res.categoryId = _.sample(isIncomeToCategoryId.income)
  } else {
    res.amount = _.random(50, 5000)
    res.categoryId = _.sample(isIncomeToCategoryId.expense)
    if (Math.random() < 0.1) {
      res.originalAmount = _.random(1, 100)
      let curr
      while (!curr || curr.split(' ').length === 2)
        curr = faker.finance.currencyCode()

      res.currency = curr
    }
    if (Math.random() < 0.8) {
      res.autocompleteData = {}
      res.autocompleteData.mcc = _.sample(mccChoices)
      res.autocompleteData.accNumber = _.random(2500, 9000).toString()
      res.autocompleteData.merchant = faker.company.companyName()
    }
  }
  res.isDraft = Math.random() < 0.01
  res.tags = JSON.stringify(
    Math.random() < 0.2
      ? [Array(_.random(1, 2)).keys()].map(() => _.sample(tagsChoices))
      : [],
  )
  res.autocompleteData = JSON.stringify(res.autocompleteData)

  return res
}

const buildCorrectionTransaction = () => ({
  ...buildBaseTransaction(),
  type: 'correction',
  isActiveReference: null,
  isIncome: Math.random() > 0.5,
  amount: _.random(50, 5000),
})

const buildReferenceTransaction = (isActive = false) => ({
  ...buildBaseTransaction(),
  type: 'balanceReference',
  isActiveReference: isActive,
  isIncome: Math.random() > 0.5,
  amount: _.random(50000, 100000),
})

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ents = []
    for (const id of categoryIds) {
      const isIncome = Math.random() < 0.1
      if (isIncome) isIncomeToCategoryId.income.push(id)
      else isIncomeToCategoryId.expense.push(id)

      const created = randomDateBetween(
        startDate,
        new Date(endDate.getTime() - 10000),
      )
      const updated = randomDateBetween(created, endDate)
      ents.push({
        id,
        isIncome,
        created,
        updated,
        title: faker.commerce.department(),
        color: faker.internet.color(),
      })
    }
    try {
      await queryInterface.bulkInsert('Categories', ents)

      const created = new Date()

      await queryInterface.bulkInsert('SearchFilters', [
        {
          id: searchFilterIds[0],
          created,
          updated: created,
          title: 'Всё',
          parameters: JSON.stringify({ datetime: {}, category: {}, tag: {} }),
          balanceType: 'independent',
          sharedBalanceSearchFilterId: null,
        },
        {
          id: searchFilterIds[1],
          created,
          updated: created,
          title: 'По месяцу, без двух пары тегов',
          parameters: JSON.stringify({
            datetime: { type: 'calendar', period: 'month' },
            category: {},
            tag: { exclude: _.sampleSize(tagsChoices, 3) },
          }),
          balanceType: 'reference',
          sharedBalanceSearchFilterId: searchFilterIds[0],
        },
      ])

      for (let i = 0; i <= 25; i++) {
        await queryInterface.bulkInsert(
          'Transactions',
          [...Array(100).keys()].map(transactionBuilder),
        )
      }
      await queryInterface.bulkInsert(
        'Transactions',
        [...Array(10).keys()].map(buildCorrectionTransaction),
      )
      await queryInterface.bulkInsert('Transactions', [
        buildReferenceTransaction(),
        buildReferenceTransaction(true),
      ])
    } catch (error) {
      console.error(error)
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('SearchFilters', {
      where: { id: { [Sequelize.Op.in]: searchFilterIds } },
    })
    await queryInterface.bulkDelete('Transactions', {
      where: { categoryId: { [Sequelize.Op.in]: categoryIds } },
    })
    return queryInterface.bulkDelete('Categories', {
      where: { id: { [Sequelize.Op.in]: categoryIds } },
    })
  },
}

import {
  balanceTransactionScheme,
  BalanceTransactionTypes,
} from '../balanceTransaction.model'

describe('Balance Transaction Scheme', () => {
  const baseObj = {
    id: '1',
    searchFilterId: '1',
    created: 1234,
    updated: 1234,
    datetime: 1234,
    amount: '12341.12',
  }

  it('validates correction transaction', () => {
    const obj = {
      ...baseObj,
      type: BalanceTransactionTypes.correction,
    }

    expect(balanceTransactionScheme.isValidSync(obj)).toBe(true)
  })

  it('validates reference transaction', () => {
    const obj = {
      ...baseObj,
      type: BalanceTransactionTypes.balanceReference,
      isActiveReference: false,
    }

    expect(balanceTransactionScheme.isValidSync(obj)).toBe(true)
  })
})

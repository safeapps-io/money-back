import { transactionScheme, TransactionTypes } from '../transaction.model'

describe('Transaction Scheme', () => {
  const baseObj = {
    id: '1',
    created: 1234,
    updated: 1234,
    type: TransactionTypes.usual,
    datetime: 1234,
    isIncome: false,
    amount: '12341.12',
  }

  it('validates usual transaction', () => {
    const obj = {
      ...baseObj,
      categoryId: '1234',
      owner: 'qwer',
      isDraft: false,
    }

    expect(transactionScheme.isValidSync(obj)).toBe(true)
  })

  it('validates balance correction transaction', () => {
    const obj = { ...baseObj, type: TransactionTypes.correction }
    expect(transactionScheme.isValidSync(obj)).toBe(true)
  })

  it('validates balance reference transaction', () => {
    const obj = {
      ...baseObj,
      type: TransactionTypes.balanceReference,
      isActiveReference: false,
    }
    expect(transactionScheme.isValidSync(obj)).toBe(true)
  })
})

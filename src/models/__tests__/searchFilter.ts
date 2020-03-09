import { searchFilterScheme, BalanceType } from '../searchFilter.model'

describe('Search Filter scheme', () => {
  const baseObj = {
    id: '1',
    created: 1234,
    updated: 1234,
    title: 'test',
    balanceType: BalanceType.independent,
    parameters: {},
  }

  it('validates filter without balance', () => {
    const obj = { ...baseObj, balanceType: null }
    expect(searchFilterScheme.isValidSync(obj)).toBe(true)
  })

  it('validates filter without reference', () => {
    const obj = { ...baseObj }
    expect(searchFilterScheme.isValidSync(obj)).toBe(true)
  })

  it('validates filter with reference', () => {
    const obj = {
      ...baseObj,
      balanceType: BalanceType.reference,
      sharedBalanceSearchFilterId: '1234',
    }
    expect(searchFilterScheme.isValidSync(obj)).toBe(true)
  })
})

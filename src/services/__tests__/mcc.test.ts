import { MCCService } from '../mcc'

describe('MCC Service', () => {
  it('returns description for existing types and null for non-existing', () => {
    const [valid, nonValid] = MCCService.getCodeDescription(['1731', '1234'])
    expect(typeof valid.description).toBe('string')
    expect(nonValid.description).toBeUndefined()
  })
})

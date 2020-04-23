const mockUserManager = {
  getUserById: jest.fn(),
}
jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))

import { InviteService, InviteServiceFormErrors } from '../invite'
import { FormValidationError } from '@/core/errors'

describe('Invite service', () => {
  beforeEach(() => mockUserManager.getUserById.mockClear())

  it('generates valid invite and validates it correctly', async () => {
    mockUserManager.getUserById.mockImplementation(async () => true)

    const id = 'testId'
    const inviteId = InviteService.generateInviteString(id)
    const res = await InviteService.getUserIdFromInvite(inviteId)
    expect(res).toBe(id)
  })

  it('throws if invite is invalid', async () => {
    mockUserManager.getUserById.mockImplementation(async () => true)

    try {
      await InviteService.getUserIdFromInvite('19823746918723649817236123')
      throw new Error()
    } catch (error) {
      expect(error).toBeInstanceOf(FormValidationError)
      expect(error.message).toBe(InviteServiceFormErrors.invalidInvite)
    }
  })

  it('throws if no such user can be found', async () => {
    mockUserManager.getUserById.mockImplementation(async () => false)

    const id = 'testId'
    const inviteId = InviteService.generateInviteString(id)

    try {
      await InviteService.getUserIdFromInvite(inviteId)
      throw new Error()
    } catch (error) {
      expect(error).toBeInstanceOf(FormValidationError)
      expect(error.message).toBe(InviteServiceFormErrors.invalidInvite)
    }
  })
})

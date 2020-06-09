import { clearMocks } from '@/utils/jestHelpers'

const mockUserManager = {
    byId: jest.fn(),
  },
  mockWalletManager = {
    byId: jest.fn(),
    addRejectedInvite: jest.fn(),
    addUser: jest.fn(),
    removeUserByWaId: jest.fn(),
    removeWithJoiningError: jest.fn(),
  },
  mockInvitePubSubService = {
    requestToOwner: jest.fn(),
    invitationError: jest.fn(),
    invitationReject: jest.fn(),
    invitationAccept: jest.fn(),
    joiningError: jest.fn(),
  },
  mockWalletPubSubService = {
    publishWalletUpdates: jest.fn(),
  }

jest.mock('@/models/user.model', () => ({
  __esModule: true,
  UserManager: mockUserManager,
}))
jest.mock('@/models/wallet.model', () => ({
  __esModule: true,
  WalletManager: mockWalletManager,
}))
jest.mock('@/services/invite/invitePubSubService', () => ({
  __esModule: true,
  InvitePubSubService: mockInvitePubSubService,
}))
jest.mock('@/services/wallet/walletPubSubService', () => ({
  __esModule: true,
  WalletPubSubService: mockWalletPubSubService,
}))

import { InviteService, InviteServiceFormErrors } from '../inviteService'
import { FormValidationError } from '@/services/errors'
import { AccessLevels } from '@/models/walletAccess.model'

describe('Invite service', () => {
  describe('common invites', () => {
    beforeEach(() => {
      clearMocks(mockUserManager)
    })

    it('generates valid invite and validates it correctly', async () => {
      mockUserManager.byId.mockImplementation(async () => true)

      const id = 'testId'
      const inviteId = InviteService.generateInviteString(id)
      const res = await InviteService.getUserIdFromInvite(inviteId)
      expect(res).toBe(id)
    })

    it('throws if invite is invalid', async () => {
      mockUserManager.byId.mockImplementation(async () => true)

      const r = await expect(
        InviteService.getUserIdFromInvite('19823746918723649817236123'),
      ).rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)
    })

    it('throws if no such user can be found', async () => {
      mockUserManager.byId.mockImplementation(async () => false)

      const id = 'testId'
      const inviteId = InviteService.generateInviteString(id)

      const r = await expect(InviteService.getUserIdFromInvite(inviteId))
        .rejects
      await r.toThrow(FormValidationError)
      await r.toThrow(InviteServiceFormErrors.invalidInvite)
    })
  })

  describe('wallet invites', () => {
    beforeEach(() => {
      clearMocks(mockWalletManager)
      clearMocks(mockInvitePubSubService)
      clearMocks(mockWalletPubSubService)

      mockWalletManager.byId.mockImplementation(async () => ({
        id: walletId,
        users: [
          {
            ...walletOwner,
            WalletAccess: { accessLevel: AccessLevels.owner },
          },
        ],
      }))
      mockInvitePubSubService.requestToOwner.mockImplementation(async () => 1)
    })

    const walletId = '098765',
      ownerId = 'ownerId',
      joiningUserId = 'joiningId',
      b64InvitePublicKey =
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAthWUoWqCbohAOoMO4SVu62m2lztNCRiTxlzFzbf5M+Kwg/m/YcOYxM5cYR8bB0hgtTZIGcHzHsynsha5yFG9Hs34J99fE2FmABavXymEIQ761B3+J86OVS9p53aoTFngaqRtJum8jh0XCS7TNw4Mm/rrs4y4B1VzW4sMbSqqY2JpXrQiGVm2H/UFYiFmFi3EVtu4p8mr5O2MPCfCr0qYXbbRHl6oD1mDMkTvgK7LByW+AkSvGA8fd6O3UBTVImZvR/+x+Cr5zU4MeZ+Uz3BEfQiYL1nWbsVXnPUkbPQV4zpGCqmxB7eMo191IsqZ6/OJMggE4ndQXueopBgHhXVY3wIDAQAB',
      // For generating other signatures, just in case
      b64InvitePrivateKey =
        'u2jPm81j0T5Mc1T61lgVb/o6GjMoz9v43+VimwFAWuD8Of1FNw6mojF2+hOUIRxw5uq+G6AGjqyLypoo7Bau6x4KVWZv7bDwrMJ5kH7JPAJLG8vxHK4uLT0a/r4ilcdjUdseu4h7TeuYydFznAQEFSg6GH+AMfb+jmnYcDrsa/Z5SPg4ac9+SZ99udUexK5OsnI8v00tE4kzTai4Lh3whB86l8cF/7+tcW3wA9GqmA/99ufjb8XNSTqHuzGPrOUWuDGfC09XdSI71a1l2wfEfPT01lL+tEDkXgQ9Pl+vbF8/PvEOwZ6GYwdVR9h1QrLKCDTC/okxko1PWQV0Q0QiSbgpdlYNzd/jgP2pX6TqlwA85TkU1SkjYa64Cft/cvMdFSG+zLb/qL7FEpYRTg4lCfLGuNQcNLy+m34UflQ/OnCmhI/89xq0NUFoi7VQ03Hn9R0DjI831ZspcuG+XqTLk3116tR4ubo0Cx8Jrp6D740riBvu/pgd1AYsU1yltzVenI8Q8g0MVfuwbCeup6Z8Jfy6Xeo+sOJFnpm7V64eY2LE611NP3ZZOqYzWttxLUN6UhZtjREbzz/C8MZ5LwNLiTBDRcDLzzxKF1EeLAMaPjJLvnjBcHtcFKvUUDfLQDGbnpquKSydDmUG2mWi66fpTa6qczYOWaEIvNpti24XstXpxVcMls/MUjra7pR2V31R9SBcDU4qJoQbpCo355ym6qmbsBNwkZFlbzpQcddZYProJ8Il3EpxhdidapAGnPnZitIlxeiOAFq3nU7/s6Qx6z/Wzs0nFAQzLGLkg5OtfAA4cU1L2AcCz1tmM26PB3SCnShHpvPa9ur/Yy19qogZAulfQ8vqMx36UyrUtiUuEIBnasNR1pbJnkjE46q+J7kSm8hA34DcNZbDtznx1Wxsh3Us6qWexbxp1CBlKT+55cIo5rMrGFWd7u8s6ljjeAkAc3FTFAYzjMEisXBZYShiKmf5E1BTElSlVl8dPl4XxQN9vv/oS+TB/P77tvg0yljmJRr5B/SK2hZIW5XiMlzwGrKkDxcuuZJ2uWYe3/cyZy/PkELHk4x84swmRXfGcnMfk17mBM+HvQrhMDkocgxIq2vCB9DoCwwAK1kCuUIRQ4U0k50HNJn+3Zxkqkg3kJR/7yDgvvoEQzvTiBzA3lOJk0WGykLkuYrwam3p8Td60sm3xRWJY7ESBikVhMptwOJWOTEJYapjy5hOelr1OBOqyhBwPNAekP+DRO0mYhYS9m5S8y85jZG7r2TtWjiks73a3MJSZu3nTVguHpX/9GWD7psghrsUzNqp6HyQl39lYJv1u81WakaGQRBo1BKu/OY5NWhjv3lBftXH40zO/mXI70morFHT64yq+rrgGiZlky4cFIYHnktpLPsBqi/fHU8Q+3/uA47ttrB7OAS/tBTFdARySSkEZizPQS/yv0ZY+Z5NMCXwt1J5VjsH6ETgIT/vfrmc7/IBnWBRYCBGs1hnvJ07jzXzQX/XUyiWLEIc3dH0C0MZIpehR4Gw0IXzzifh4nKNeABMjh5Nrzf6G8PMRY+LDhPYrNzcvKVDAqkqtdKcXK4CltbMOfCnk+ECzUmpPaHN1dwDI6VjswjBYc50Jsb7E5F6Kuz3aUvUj2Dube1cnQ==',
      b64PublicECDHKey = 'nonce',
      encryptedSecretKey = 'nonce',
      inviteId = '123456',
      b64InviteString =
        'eyJpbnZpdGVJZCI6IjEyMzQ1NiIsIndhbGxldElkIjoiMDk4NzY1In0=___TDPz1jgGngJ29bPBExEJV8qKoEQtTZR+Rr9r7M1oJpz4FJo/LNP9wBX/x8SFeZo7ZiwuFf8sW58NYtYCvlVAx8gm5ZOBFK2Q0PA4Hoy1EH+mWh839GO/4BZtnSKAlySxvI+7VMFOESjqpm4BvKLtHtVLUw2N+E4kbxZqHUImdngVRoMgyQmhw5oSAOFww7myGV8ajPXsYuIsGoufJQjy6U772FzTGl+yI8gITnWZ1mSXQOlpapZRAiyT1wktyOVjza52rwYcA8nVTfJbnudIME+Ht+gE+fTjJPBDDlushuZcS28TRjCCLx2lowMFZ2XkhR6CypFrdJqk1wIYhYX9Mg==',
      b64InviteSignatureByJoiningUser =
        'Im3K3AA3ayF8M8/v8xZWQ9quCmWqaNAuDyh8rjBlqWC8VxUHE9R1p0j353QmzX8Zauun3JlZqbVDBP4N1huTtLem5sxuIZmT3ahgS2azYzN0yNyc1wdDVnq8VOYbGis15APB/s83xKiY+LvpcPffMBt/HuYplIBwZE9J/FIUU8fHIbjGuI7RybP2uScTf4FGJqBLVUtrQH3NOAKSvR2z3QK8VZ1iuMt9Q6F5DNktll+o/J5d9Rn91C0nAhwod5MGirQ+1K9wvi56GiRVRQbT71OwfKAkRTUmvUAMsndZWZZCTB4uubHy2cJwZw7DH4KmthLbIJM61s1JcN91jrMQTQ==',
      walletOwner = {
        id: ownerId,
        username: 'owner',
        b64InvitePublicKey,
      } as any,
      joiningUser = {
        id: joiningUserId,
        username: 'joiningUser',
        // Using the same key for simplicity
        b64InvitePublicKey,
      } as any

    describe('validate invite', () => {
      it('works ok', async () => {
        await InviteService.validateInvite({
          joiningUser,
          b64InviteString,
          b64InviteSignatureByJoiningUser,
          b64PublicECDHKey,
        })
        expect(mockInvitePubSubService.requestToOwner.mock.calls.length).toBe(1)
        expect(
          mockInvitePubSubService.requestToOwner.mock.calls[0][0].walletOwner
            .id,
        ).toBe(walletOwner.id)
      })

      it('throws if invalid data', async () => {
        await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString: null as any,
            b64InviteSignatureByJoiningUser: null as any,
            b64PublicECDHKey: null as any,
          }),
        ).rejects.toThrowError(Error)
      })

      it('throws if invalid invite string (not JSON, no signature)', async () => {
        let r: any

        r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString: b64InviteString.split('___').join('_'),
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)

        // it has `null` encoded as b64 object
        const fakeInvite =
          'bnVsbA==___C9eHo6lj6S3Fup9anWVpdyY5ThqfrLb0ldH70P3KM+MDemPifkNMc+maPlXzjHVXbC52pLaWimpdrZcyomTvc/3IdD5YS5ZGM+5W41+JlW31+MxNGOPwdvkBLmkA0AscZozrJD1fb8f1pui+AzhfLI5w92w1ai1F+EOw12yi8aVzAHp1VJqxTyp4lSQuwTR3RBjzjZX4c0zYKN32+dx8Y5BxZ7/MG6zBedNmPjYZiTU5X9it12T1FvVFJQeHmM0P0FkD930nPc4uhvfuQnSNYYnU3JCiwZXh/qoBy9R8b+/V1S5HpU8nyEYgEKERrnXmKeJYEG7ZVixkpzB/3uoTJg=='
        r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString: fakeInvite,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })

      it('throws if no such wallet', async () => {
        mockWalletManager.byId.mockImplementationOnce(async () => null)
        const r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })

      it('throws if user is already a member', async () => {
        const res = await mockWalletManager.byId(walletId)
        mockWalletManager.byId.mockImplementationOnce(async () => {
          return {
            ...res,
            users: [...res.users, { id: joiningUserId }],
          }
        })

        const r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.alreadyMember)
      })

      it('throws if invite has already been used', async () => {
        const res = await mockWalletManager.byId(walletId)
        res.users[0].WalletAccess.inviteId = inviteId
        mockWalletManager.byId.mockImplementationOnce(async () => res)

        const r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.inviteAlreadyUsed)
      })

      it('throws if wallet has no owner or he has no publicKey', async () => {
        let res = await mockWalletManager.byId(walletId)
        res.users[0].WalletAccess.accessLevel = 'none'
        mockWalletManager.byId.mockImplementationOnce(async () => res)

        let r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)

        res = await mockWalletManager.byId(walletId)
        res.users[0].b64InvitePublicKey = undefined
        mockWalletManager.byId.mockImplementationOnce(async () => res)

        r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if signature is not verified', async () => {
        // Correct invite string, but signed with some other key
        const newInviteString =
          'eyJpbnZpdGVJZCI6IjEyMzQ1NiIsIndhbGxldElkIjoiMDk4NzY1In0=___F5kPw+3Qg2VNYNtws+3MX3k8uCi7c9LDKOucE6OIMbkXsiEqXeGxMPzZl/qZekQ69BqEH4LeaDsh78XZzG3WJqSIRerPd+QT722vru7ZMBhfwgbaLfleGfu4CIw4xMMwqH+mLZ6qMUuY9e7rmXEaLQwNh4nnm1BWBzJTPisnM6EJob+8jEMLLKhPMIogbRainyVDO4qsE4zlcRlB65eiQRmE4eiDkfC0JeF1aJnL7FXyMq62pb2yvRMS62R831Vh5lAlTjgOPax0R+mid4HfqGpjgUNRO6heLphovebY2zy5pSiLRCIsN/hhei2wR98iJ6cArs+QG6XB+iwEBoBgtw=='

        const r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString: newInviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })

      it('throws if owner is offline', async () => {
        mockInvitePubSubService.requestToOwner.mockImplementationOnce(
          async () => 0,
        )

        const r = await expect(
          InviteService.validateInvite({
            joiningUser,
            b64InviteString,
            b64InviteSignatureByJoiningUser,
            b64PublicECDHKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.ownerOffline)
      })
    })

    describe('invitation error', () => {
      // Here we check owner invitation message once and for all
      beforeEach(() => {
        mockUserManager.byId.mockImplementation(async () => joiningUser)
      })

      it('works ok', async () => {
        await InviteService.invitationError({
          walletOwner,
          joiningUserId,
          b64InviteSignatureByJoiningUser,
          b64InviteString,
        })
        const c = mockInvitePubSubService.invitationError.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].joiningUser.id).toBe(joiningUserId)
        expect(c[0][0].walletId).toBe(walletId)
      })

      it('throws if invalid joining user id, signature or invite string', async () => {
        return expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId: null as any,
            b64InviteSignatureByJoiningUser: null as any,
            b64InviteString: null as any,
          }),
        ).rejects.toThrow(FormValidationError)
      })

      it('throws if no wallet, joining user found, or joining user has no public key', async () => {
        mockWalletManager.byId.mockImplementationOnce(async () => null)
        let r: any

        r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)

        mockUserManager.byId.mockImplementationOnce(async () => null)

        r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if wallet has no owner', async () => {
        const res = await mockWalletManager.byId()
        res.users[0].WalletAccess.accessLevel = 'no'
        mockWalletManager.byId.mockImplementationOnce(async () => res)

        const r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if joining user signature is invalid', async () => {
        // Signed with some other key
        const invalidJoiningSignature =
          'XvbQacRt+FBt1GZvOy90nFQ/vgeYAucIYlOOd5kjIJxGErZwAMGH5YTRUXpgG6DOKUHl2KrCPsV4nCq0/GV/EvClC2h4bAkySu5sVAOKP5B+GngJUgKcm0CvCW2XqdqjS8zBRfA06wYI1oM51+XDtGpVFGfCGucPRUdDVQRsbK1UA4mlG/7aYNfsiqeDEViAPdJLt5GbRbQtNzRn9sGDSnpT1tlxO9iW/NbGS/z3oDokn9MR6AOhVuCN3Ni3FtWgyAr4ScRPEtmblIpOsvW5x3UZZUF5Sj2xjb4HeALFD7v4scLcrn/INgtPTTz9abEL4gAgqWhAKugGGKqlawjqAQ=='
        let r: any

        r = await expect(
          InviteService.invitationError({
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser: invalidJoiningSignature,
            b64InviteString,
          }),
        ).rejects
        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.invalidInvite)
      })
    })

    describe('invitation resolution', () => {
      beforeEach(() => {
        mockUserManager.byId.mockImplementation(async () => joiningUser)
      })

      it('rejects ok', async () => {
        await InviteService.invitationResolution({
          allowJoin: false,
          walletOwner,
          joiningUserId,
          b64InviteSignatureByJoiningUser,
          b64InviteString,
        })

        let c = mockWalletManager.addRejectedInvite.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].inviteId).toBe(inviteId)

        c = mockInvitePubSubService.invitationReject.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].joiningUser.id).toBe(joiningUserId)

        c = mockWalletPubSubService.publishWalletUpdates.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].wallet.id).toBe(walletId)
      })

      it('accepts ok', async () => {
        mockInvitePubSubService.invitationAccept.mockImplementationOnce(
          async () => 1,
        )

        await InviteService.invitationResolution({
          allowJoin: true,
          walletOwner,
          joiningUserId,
          b64InviteSignatureByJoiningUser,
          b64InviteString,
          b64PublicECDHKey,
          encryptedSecretKey,
        })

        let c = mockWalletManager.addUser.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].userId).toBe(joiningUserId)
        expect(c[0][0].inviteId).toBe(inviteId)
        expect(c[0][0].walletId).toBe(walletId)

        c = mockInvitePubSubService.invitationAccept.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].joiningUser.id).toBe(joiningUserId)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].encryptedSecretKey).toBe(encryptedSecretKey)
        expect(c[0][0].b64PublicECDHKey).toBe(b64PublicECDHKey)

        c = mockWalletPubSubService.publishWalletUpdates.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].wallet.id).toBe(walletId)
      })

      it('throws if invalid public ecdh key or encrypted secret key', async () => {
        return expect(
          InviteService.invitationResolution({
            allowJoin: true,
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
            b64PublicECDHKey: null as any,
            encryptedSecretKey: null as any,
          }),
        ).rejects.toThrow(FormValidationError)
      })

      it('removes wa and throws if joining user is offline', async () => {
        const waId = '12341234'
        mockInvitePubSubService.invitationAccept.mockImplementationOnce(
          async () => 0,
        )
        mockWalletManager.addUser.mockImplementationOnce(async () => ({
          id: waId,
        }))

        const r = await expect(
          InviteService.invitationResolution({
            allowJoin: true,
            walletOwner,
            joiningUserId,
            b64InviteSignatureByJoiningUser,
            b64InviteString,
            b64PublicECDHKey,
            encryptedSecretKey,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.joiningUserOffline)

        const c = mockWalletManager.removeUserByWaId.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0]).toBe(waId)
      })
    })

    describe('joining error', () => {
      it('works ok', async () => {
        mockWalletManager.removeWithJoiningError.mockImplementationOnce(
          async () => 1,
        )

        await InviteService.joiningError({ joiningUser, b64InviteString })

        let c = mockWalletManager.removeWithJoiningError.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].userId).toBe(joiningUserId)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].inviteId).toBe(inviteId)

        c = mockWalletPubSubService.publishWalletUpdates.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].wallet.id).toBe(walletId)

        c = mockInvitePubSubService.joiningError.mock.calls
        expect(c.length).toBe(1)
        expect(c[0][0].walletId).toBe(walletId)
        expect(c[0][0].ownerId).toBe(ownerId)
        expect(c[0][0].username).toBe(joiningUser.username)
      })

      it('throws if invalid invite string', async () => {
        return expect(
          InviteService.joiningError({
            joiningUser,
            b64InviteString: null as any,
          }),
        ).rejects.toThrow(FormValidationError)
      })

      it('throws if nothing was deleted', async () => {
        mockWalletManager.removeWithJoiningError.mockImplementationOnce(
          async () => 0,
        )

        const r = await expect(
          InviteService.joiningError({
            joiningUser,
            b64InviteString,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })

      it('throws if no wallet or wallet owner was found', async () => {
        mockWalletManager.byId.mockImplementationOnce(async () => null)

        const r = await expect(
          InviteService.joiningError({
            joiningUser,
            b64InviteString,
          }),
        ).rejects

        await r.toThrow(FormValidationError)
        await r.toThrow(InviteServiceFormErrors.unknownError)
      })
    })
  })
})

import * as yup from 'yup'
import { addHours, isBefore } from 'date-fns'

import { getTransaction } from '@/models/setup'
import User, { UserManager } from '@/models/user.model'
import { RefreshTokenManager } from '@/models/refreshToken.model'

import {
  runSchemaWithFormError,
  requiredString,
  optionalString,
} from '@/utils/yupHelpers'
import { decryptAes, encryptAes, signJwt, verifyJwt } from '@/utils/crypto'

import { FormValidationError } from '@/services/errors'
import { InviteService } from '@/services/invite/inviteService'
import { WalletService } from '@/services/wallet/walletService'
import { InviteStringTypes } from '@/services/invite/inviteTypes'
import { getFullPath } from '@/services/getPath'
import { MessageService } from '@/services/message/messageService'

import { ValidateEmailService } from './validateEmailService'
import { PasswordService, passwordScheme } from './passwordService'
import { publishUserUpdate } from './userEvents'

export enum JWTSubjects {
  session = 'sess',
  wsTicket = 'tick',
}

type JWTMessage = {
  // user id
  id: string
  exp?: number
}

export type Session = {
  id: string
  description: string
  created: number
  current: boolean
}

const usernameScheme = yup.string().required().min(5).max(50),
  emailScheme = yup.string().email().notRequired().nullable()

export class UserService {
  private static async generateRefreshToken(data: {
    userId: string
    description: string
  }) {
    return (await RefreshTokenManager.create(data)).key
  }

  private static async generateToken({
    refreshToken,
    userId,
    withCheck = true,
    expiresIn = '15m',
    subject = JWTSubjects.session,
  }: {
    refreshToken: string
    userId: string
    withCheck?: boolean
    expiresIn?: string
    subject?: JWTSubjects
  }) {
    if (withCheck) {
      const tokenValid = await RefreshTokenManager.exists({
        token: refreshToken,
        userId,
      })
      if (!tokenValid) throw new InvalidToken()
    }

    const data: JWTMessage = { id: userId }

    return signJwt(data, {
      subject,
      expiresIn,
      noTimestamp: true,
    })
  }

  private static async newSignIn({
    userId,
    description,
  }: {
    userId: string
    description: string
  }) {
    const refreshToken = await this.generateRefreshToken({
      userId,
      description,
    })
    const accessToken = await this.generateToken({
      refreshToken,
      userId,
      withCheck: false,
    })

    return { refreshToken, accessToken }
  }

  private static async checkCredentialsAvailability({
    email,
    username,
    excludeId,
  }: {
    username: string
    email?: string
    excludeId?: string
  }) {
    const promises = []
    promises.push(UserManager.isUsernameTaken(username, excludeId))

    if (email) promises.push(UserManager.isEmailTaken(email, excludeId))
    const [usernameTaken, emailTaken] = await Promise.all(promises)

    if (usernameTaken)
      throw new FormValidationError(UserServiceFormErrors.usernameTaken, {
        username: [UserServiceFormErrors.usernameTaken],
      })
    else if (emailTaken)
      throw new FormValidationError(UserServiceFormErrors.emailTaken, {
        email: [UserServiceFormErrors.emailTaken],
      })
  }

  private static signupSchema = yup
    .object({
      username: usernameScheme,
      email: emailScheme,
      password: passwordScheme,
      isSubscribed: yup.bool(),
      invite: optionalString,
    })
    .noUnknown()
  static async signup({
    username,
    email,
    password,
    description,
    isSubscribed,
    invite,
  }: {
    username: string
    email?: string
    password: string
    isSubscribed: boolean
    description: string
    invite?: string
  }) {
    runSchemaWithFormError(this.signupSchema, {
      username,
      email,
      isSubscribed,
      password,
      invite,
    })

    const { user, isWalletInvite } = await getTransaction(async () => {
      const [passwordHashed, parsedInvite] = await Promise.all([
          PasswordService.hashPassword(password),
          invite ? InviteService.parseAndValidateInvite(invite) : null,
          this.checkCredentialsAvailability({ username, email }),
        ]),
        isWalletInvite = parsedInvite?.type == InviteStringTypes.wallet

      const user = await UserManager.create({
        username,
        password: passwordHashed,
        isSubscribed,
        ...parsedInvite?.payload,
      })

      return { user, isWalletInvite }
    })

    await ValidateEmailService.triggerEmailValidation(user, email)

    return {
      ...(await this.newSignIn({ userId: user.id, description })),
      user,
      isWalletInvite,
    }
  }

  private static signinSchema = yup
    .object({
      usernameOrEmail: requiredString,
      password: requiredString,
    })
    .noUnknown()
  static async signin({
    usernameOrEmail,
    password,
    description,
  }: {
    usernameOrEmail: string
    password: string
    description: string
  }) {
    runSchemaWithFormError(this.signinSchema, { usernameOrEmail, password })

    const user = await UserManager.findByEmailOrUsername(usernameOrEmail)
    if (!user)
      throw new FormValidationError(UserServiceFormErrors.unknownUser, {
        usernameOrEmail: [UserServiceFormErrors.unknownUser],
      })

    await PasswordService.verifyPassword(user.password, password)
    const tokens = await this.newSignIn({ userId: user.id, description })

    return { ...tokens, user }
  }

  static async getNewAccessToken(accessToken: string, refreshToken: string) {
    let decoded: JWTMessage
    try {
      decoded = await verifyJwt<JWTMessage>(accessToken, {
        ignoreExpiration: true,
        subject: JWTSubjects.session,
      })
    } catch (err) {
      throw new InvalidToken()
    }
    return this.generateToken({ refreshToken, userId: decoded.id })
  }

  static async generateNewWsTicket(userId: string) {
    try {
      return this.generateToken({
        withCheck: false,
        refreshToken: '',
        userId,
        expiresIn: process.env.NODE_ENV == 'production' ? '5m' : '1m',
        subject: JWTSubjects.wsTicket,
      })
    } catch (err) {
      throw new InvalidToken()
    }
  }

  static async getUserDataFromWsTicket(ticket: string) {
    try {
      const res = await verifyJwt<JWTMessage>(ticket, {
        subject: JWTSubjects.wsTicket,
      })
      return { userId: res.id }
    } catch (err) {
      throw new InvalidToken()
    }
  }

  private static async getUserIdFromAccessToken(
    accessToken: string,
    refreshToken: string,
    newToken: boolean = false,
  ): Promise<{
    userId: string
    newToken?: string
  }> {
    try {
      const { exp: expires, id: userId } = await verifyJwt<JWTMessage>(
        accessToken,
        {
          ignoreExpiration: true,
          subject: JWTSubjects.session,
        },
      )
      if (!expires) throw new InvalidToken()

      // Issuing a new access token if the previous one is expired
      if (isBefore(expires * 1000, new Date()))
        // Calling the same method stuff recursively with a new fresh access token
        return this.getUserIdFromAccessToken(
          await this.getNewAccessToken(accessToken, refreshToken),
          refreshToken,
          true,
        )

      return {
        userId,
        newToken: newToken ? accessToken : undefined,
      }
    } catch (err) {
      throw new InvalidToken()
    }
  }

  static async getUserDataFromTokens(
    accessToken: string,
    refreshToken: string,
    fetchUser = true,
  ) {
    const { userId, newToken } = await this.getUserIdFromAccessToken(
      accessToken,
      refreshToken,
    )

    const res: {
      user?: User
      userId: string
      newToken?: string
    } = {
      userId,
      newToken,
    }
    if (fetchUser) {
      const user = await UserManager.byId(userId)
      if (!user) throw new InvalidToken()
      res.user = user
    }
    return res
  }

  static async getAllSessions(userId: string, currentKey: string) {
    const sessions = await RefreshTokenManager.byUserId(userId)
    for (const session of sessions) {
      if (session.key == currentKey) {
        // @ts-expect-error
        session.current = true
        break
      }
    }

    return sessions
  }

  static async dropSessions({
    userId,
    currentKey,
    toDeleteId,
  }: {
    userId: string
    currentKey: string
    toDeleteId: string | null
  }) {
    if (toDeleteId)
      return RefreshTokenManager.destroyById({ userId, id: toDeleteId })
    else
      return RefreshTokenManager.destroyAllButOneKey({
        userId,
        key: currentKey,
      })
  }

  static async updateUsername(
    user: User,
    {
      clientId,
      username,
    }: {
      clientId: string
      username: string
    },
  ) {
    runSchemaWithFormError(usernameScheme, username)
    if (username === user.username) return user

    await this.checkCredentialsAvailability({ username, excludeId: user.id })

    const res = await UserManager.update(user.id, { username })

    await publishUserUpdate({ user: res, clientId })
    return res
  }

  static async updateEmail(user: User, email: string) {
    if (user.email && !email)
      throw new FormValidationError(UserServiceFormErrors.cantDeleteEmail)

    runSchemaWithFormError(emailScheme, email)
    await ValidateEmailService.triggerEmailValidation(user, email)

    return user
  }

  private static encrScheme = yup
    .object({
      encr: requiredString,
      clientUpdated: yup.number().required(),
    })
    .noUnknown()
  static async incrementalUserUpdate({
    user,
    clientId,
    data,
  }: {
    user: User
    clientId: string
    data?: { encr: string; clientUpdated: number }
  }) {
    // No client update
    if (!data) return user

    // Client has stale information
    runSchemaWithFormError(this.encrScheme, data)
    if (data.clientUpdated < user.updated.getTime()) return user

    const res = await UserManager.update(user.id, { encr: data.encr })
    await publishUserUpdate({ user: res, clientId })
    return res
  }

  private static updateMasterPasswordScheme = yup.object({
    clientId: optionalString,
    encr: optionalString,
    b64salt: requiredString,
    b64InvitePublicKey: requiredString,
    b64EncryptedInvitePrivateKey: requiredString,
  })
  static async updateMasterPassword({
    userId,
    clientId,
    b64salt,
    encr,
    b64InvitePublicKey,
    b64EncryptedInvitePrivateKey,
    chests,
  }: {
    userId: string
    clientId: string
    b64salt: string
    encr: string | null
    b64InvitePublicKey: string
    b64EncryptedInvitePrivateKey: string
    chests: { walletId: string; chest: string }[]
  }) {
    runSchemaWithFormError(this.updateMasterPasswordScheme, {
      clientId,
      b64salt,
      b64InvitePublicKey,
      b64EncryptedInvitePrivateKey,
      encr,
    })
    return getTransaction(async () => {
      await UserManager.update(userId, {
        b64salt,
        b64InvitePublicKey,
        b64EncryptedInvitePrivateKey,
        encr,
      })
      await WalletService.updateChests({ userId, chests, clientId })

      return (await UserManager.byIdWithDataIncluded(userId))!
    })
  }

  private static generateUnsubscribeToken(userId: string) {
    return encryptAes({ userId })
  }

  private static parseUnsubscribeToken(token: string) {
    const { userId } = decryptAes<{ userId: string }>(token)
    return userId
  }

  static getUnsubscribeLink(userId: string) {
    return getFullPath({
      path: `/goto/${this.generateUnsubscribeToken(userId)}/unsubscribe`,
      includeHost: true,
    })
  }

  static async useUnsubscribeLink(token: string) {
    try {
      const userId = this.parseUnsubscribeToken(token)
      return this.updateIsSubscribedStatus({
        userId,
        // User can be unauthorized, so no clientId here is ok
        clientId: '',
        newStatus: false,
      })
    } catch (error) {
      throw new FormValidationError(
        UserServiceFormErrors.invalidUnsubscribeToken,
      )
    }
  }

  static async updateIsSubscribedStatus({
    clientId,
    userId,
    newStatus,
  }: {
    clientId: string
    userId: string
    newStatus: boolean
  }) {
    const user = await UserManager.update(userId, { isSubscribed: newStatus })
    publishUserUpdate({ user, clientId })
    return user
  }

  static async dropUser({ user, password }: { user: User; password: string }) {
    runSchemaWithFormError(requiredString, password)

    await PasswordService.verifyPassword(user.password, password)

    // The user is being dropped, so no `clientId` is ok
    const clientId = '',
      userId = user.id,
      wallets = await WalletService.getUserWallets(userId)

    // Deleting wallets that user owns and their presence in other wallets
    const promises: Promise<any>[] = wallets.map((wallet) =>
      WalletService.isUserOwner({ userId, wallet })
        ? WalletService.destroy(userId, wallet.id, clientId)
        : WalletService.removeUserWalletAccess(userId, wallet.id, clientId),
    )

    await Promise.all(promises)
    await UserManager.deleteUserById(userId)
  }

  static logout({
    userId,
    refreshToken,
  }: {
    userId: string
    refreshToken: string
  }) {
    runSchemaWithFormError(requiredString, refreshToken)

    return RefreshTokenManager.destroy({ userId, key: refreshToken })
  }

  static async notifySignupCount() {
    const end = new Date(),
      start = addHours(end, -24)
    const users = await UserManager.createdBetweenDates(start, end)
    return MessageService.dailySignupStats(users.map((user) => user.username))
  }
}

export enum UserServiceFormErrors {
  emailTaken = 'user.emailTaken',
  usernameTaken = 'user.usernameTaken',
  unknownUser = 'user.unknownUser',
  cantDeleteEmail = 'cantDeleteEmail',
  invalidUnsubscribeToken = 'invalidUnsubscribeToken',
}

export class AuthError extends Error {}
export class InvalidToken extends AuthError {}

import * as yup from 'yup'
import { isBefore } from 'date-fns'

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

import { ValidateEmailService } from './validateEmailService'
import { PasswordService, passwordScheme } from './passwordService'
import { UserUpdatesPubSubService } from './userUpdatesPubSubService'
import { InviteStringTypes } from '@/services/invite/inviteTypes'
import { getFullPath } from '../getPath'

export enum JWTSubjects {
  session = 'sess',
  wsTicket = 'tick',
}

type JWTMessage = {
  id: string
  exp?: number
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
    expiresIn = '1m',
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

  static async getUserFromWsTicket(ticket: string, prevUser?: User | null) {
    try {
      const { id } = await verifyJwt<JWTMessage>(ticket, {
        subject: JWTSubjects.wsTicket,
      })
      // Avioiding extra query
      if (prevUser?.id == id) return prevUser

      const user = await UserManager.byId(id)
      if (!user) throw new InvalidToken()

      return user
    } catch (err) {
      throw new InvalidToken()
    }
  }

  static async getUserFromTokens(accessToken: string, refreshToken: string) {
    let decoded: JWTMessage
    try {
      decoded = await verifyJwt<JWTMessage>(accessToken, {
        ignoreExpiration: true,
        subject: JWTSubjects.session,
      })
      if (!decoded.exp) throw new InvalidToken()
    } catch (err) {
      throw new InvalidToken()
    }

    let newToken: string | null = null
    // Date constructor expects ms, but we get seconds here
    if (isBefore(decoded.exp * 1000, new Date()))
      newToken = await this.getNewAccessToken(accessToken, refreshToken)
    const user = await UserManager.byId(decoded.id)

    if (!user) throw new InvalidToken()

    return { user, newToken }
  }

  static async getAllSessions(userId: string, currentKey: string) {
    const sessions = await RefreshTokenManager.byUserId(userId),
      result = sessions.map((session) => {
        const json = session.toJSON()
        json.current = session.key == currentKey
        return json as {
          id: string
          description: string
          created: number
          current: boolean
        }
      })
    return result
  }

  static async dropSessions({
    userId,
    toDeleteIds,
  }: {
    userId: string
    toDeleteIds: string[]
  }) {
    return RefreshTokenManager.destroyByIds({ userId, ids: toDeleteIds })
  }

  static async updateUsername(
    user: User,
    {
      socketId,
      username,
    }: {
      socketId?: string
      username: string
    },
  ) {
    runSchemaWithFormError(usernameScheme, username)
    if (username === user.username) return user

    await this.checkCredentialsAvailability({ username, excludeId: user.id })

    const res = await UserManager.update(user.id, { username })

    // We plan to use this method outside of websocket connection, so no socket id here is ok
    await UserUpdatesPubSubService.publishUserUpdates({
      user: res,
      socketId,
    })
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
    socketId,
    data,
  }: {
    user: User
    socketId?: string
    data?: { encr: string; clientUpdated: number }
  }) {
    // No client update
    if (!data) return user

    // Client has stale information
    runSchemaWithFormError(this.encrScheme, data)
    if (data.clientUpdated < user.updated.getTime()) return user

    const res = await UserManager.update(user.id, { encr: data.encr })
    await UserUpdatesPubSubService.publishUserUpdates({ user: res, socketId })
    return res
  }

  private static updateMasterPasswordScheme = yup.object({
    b64salt: requiredString,
    b64InvitePublicKey: requiredString,
    b64EncryptedInvitePrivateKey: requiredString,
  })
  static async updateMasterPassword({
    user,
    b64salt,
    b64InvitePublicKey,
    b64EncryptedInvitePrivateKey,
    chests,
  }: {
    user: User
    b64salt: string
    b64InvitePublicKey: string
    b64EncryptedInvitePrivateKey: string
    chests: { walletId: string; chest: string }[]
  }) {
    runSchemaWithFormError(this.updateMasterPasswordScheme, {
      b64salt,
      b64InvitePublicKey,
      b64EncryptedInvitePrivateKey,
    })
    return getTransaction(async () => {
      const updatedUser = await UserManager.update(user.id, {
        b64salt,
        b64InvitePublicKey,
        b64EncryptedInvitePrivateKey,
      })
      await WalletService.updateChests({ userId: user.id, chests })

      return updatedUser
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
      return this.updateIsSubscribedStatus({ userId, newStatus: false })
    } catch (error) {
      throw new FormValidationError(
        UserServiceFormErrors.invalidUnsubscribeToken,
      )
    }
  }

  static updateIsSubscribedStatus({
    userId,
    newStatus,
  }: {
    userId: string
    newStatus: boolean
  }) {
    return UserManager.update(userId, { isSubscribed: newStatus })
  }

  static async dropUser({ user, password }: { user: User; password: string }) {
    runSchemaWithFormError(requiredString, password)

    await PasswordService.verifyPassword(user.password, password)

    const userId = user.id,
      wallets = await WalletService.getUserWallets(userId)

    // Deleting wallets that user owns and their presence in other wallets
    const promises: Promise<any>[] = wallets.map((wallet) =>
      WalletService.isUserOwner({ userId, wallet })
        ? WalletService.destroy(userId, wallet.id)
        : WalletService.removeUserWalletAccess(userId, wallet.id),
    )

    await Promise.all(promises)
    await UserManager.deleteUserById(userId)
  }

  static logout({ user, refreshToken }: { user: User; refreshToken: string }) {
    runSchemaWithFormError(requiredString, refreshToken)

    return RefreshTokenManager.destroy({ userId: user.id, key: refreshToken })
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

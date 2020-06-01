import * as yup from 'yup'
import { isBefore } from 'date-fns'

import { getTransaction } from '@/models/setup'
import User, { UserManager } from '@/models/user.model'
import { RefreshTokenManager } from '@/models/refreshToken.model'

import { runSchemaWithFormError, requiredString } from '@/utils/yupHelpers'
import { signJwt, verifyJwt } from '@/utils/crypto'

import { FormValidationError } from '@/services/errors'
import { InviteService } from '@/services/invite/inviteService'
import { WalletService } from '@/services/wallet/walletService'

import { ValidateEmailService } from './validateEmailService'
import { PasswordService, passwordScheme } from './passwordService'
import { UserPubSubService } from './userPubSubService'

export const jwtSubject = 'sess' // session

type JWTMessage = {
  id: string
  exp?: number
}

const usernameScheme = yup
    .string()
    .required()
    .min(5)
    .max(50),
  emailScheme = yup
    .string()
    .email()
    .notRequired()
    .nullable()

export class UserService {
  private static async generateRefreshToken(data: {
    userId: string
    description: string
  }) {
    return (await RefreshTokenManager.generateToken(data)).key
  }

  private static async generateToken({
    refreshToken,
    userId,
    withCheck = true,
  }: {
    refreshToken: string
    userId: string
    withCheck?: boolean
  }) {
    if (withCheck) {
      const tokenValid = await RefreshTokenManager.tokenExists({
        token: refreshToken,
        userId,
      })
      if (!tokenValid) throw new InvalidRefreshToken()
    }

    const data: JWTMessage = { id: userId }

    return signJwt(data, {
      expiresIn: '15m',
      subject: jwtSubject,
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
    })
    .noUnknown()
  static async signup({
    username,
    email,
    password,
    description,
    invite,
  }: {
    username: string
    email?: string
    password: string
    description: string
    invite?: string
  }) {
    runSchemaWithFormError(this.signupSchema, { username, email, password })

    // TODO: убрать, когда будет интерфейс с инвайт-ссылками
    let inviterId: string | undefined
    if (process.env.NODE_ENV === 'development' && invite === 'qwerty')
      inviterId = undefined
    else inviterId = await InviteService.getUserIdFromInvite(invite)

    await this.checkCredentialsAvailability({ username, email })

    const passwordHashed = await PasswordService.hashPassword(password)
    const user = await UserManager.create({
      username,
      password: passwordHashed,
      inviterId,
    })

    await ValidateEmailService.triggerEmailValidation(user, email)

    return { ...(await this.newSignIn({ userId: user.id, description })), user }
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

    return this.newSignIn({ userId: user.id, description })
  }

  static async getNewAccessToken(accessToken: string, refreshToken: string) {
    let decoded: JWTMessage
    try {
      decoded = await verifyJwt<JWTMessage>(accessToken, {
        ignoreExpiration: true,
        subject: jwtSubject,
      })
    } catch (err) {
      throw new InvalidToken()
    }
    return this.generateToken({ refreshToken, userId: decoded.id })
  }

  static async getUserFromToken(token: string) {
    let decoded: JWTMessage
    try {
      decoded = await verifyJwt<JWTMessage>(token, {
        ignoreExpiration: true,
        subject: jwtSubject,
      })
    } catch (err) {
      throw new InvalidToken()
    }

    if (!decoded.exp) throw new InvalidToken()

    // Date constructor expects ms, but we get seconds here
    if (isBefore(decoded.exp * 1000, new Date())) throw new ExpiredToken()
    const user = await UserManager.byId(decoded.id)

    if (!user) throw new InvalidToken()

    return user
  }

  static async updateUser(
    user: User,
    {
      socketId,
      username,
      email,
    }: {
      socketId?: string
      username?: string
      email?: string
    },
  ) {
    if (user.email && !email)
      throw new FormValidationError(UserServiceFormErrors.cantDeleteEmail)

    const updateFields = {} as Partial<User>
    if (typeof username !== 'undefined') {
      runSchemaWithFormError(usernameScheme, username)
      await this.checkCredentialsAvailability({ username, excludeId: user.id })
      updateFields.username = username
    }

    if (typeof email !== 'undefined') {
      runSchemaWithFormError(emailScheme, email)
      await ValidateEmailService.triggerEmailValidation(user, email)
    }

    const res = await UserManager.update(user.id, updateFields)

    // We plan to use this method outside of websocket connection, so no socket id here is ok
    await UserPubSubService.publishUserUpdates({
      user: res,
      socketId,
    })
    return res
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
    socketId: string
    data?: { encr: string; clientUpdated: number }
  }) {
    // No client update
    if (!data) return user

    // Client has stale information
    runSchemaWithFormError(this.encrScheme, data)
    if (data.clientUpdated < user.updated.getTime()) return user

    const res = await UserManager.update(user.id, { encr: data.encr })
    await UserPubSubService.publishUserUpdates({ user: res, socketId })
    return res
  }

  static async updateMasterPassword({
    user,
    inviteKey,
    chests,
  }: {
    user: User
    inviteKey: string
    chests: { walletId: string; chest: string }[]
  }) {
    runSchemaWithFormError(requiredString, inviteKey)
    getTransaction(async () => {
      await UserManager.update(user.id, { inviteKey })
      await WalletService.updateChests({ userId: user.id, chests })
    })
  }
}

export enum UserServiceFormErrors {
  emailTaken = 'emailTaken',
  usernameTaken = 'usernameTaken',
  unknownUser = 'unknownUser',
  cantDeleteEmail = 'cantDeleteEmail',
}

export class AuthError extends Error {}
export class InvalidRefreshToken extends AuthError {}
export class InvalidToken extends AuthError {}
export class ExpiredToken extends AuthError {}

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
import { signJwt, verifyJwt } from '@/utils/crypto'

import { FormValidationError } from '@/services/errors'
import { InviteService } from '@/services/invite/inviteService'
import { WalletService } from '@/services/wallet/walletService'

import { ValidateEmailService } from './validateEmailService'
import { PasswordService, passwordScheme } from './passwordService'
import { UserUpdatesPubSubService } from './userUpdatesPubSubService'
import { InviteStringTypes } from '@/services/invite/inviteTypes'

export const jwtSubject = 'sess' // session

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
  }: {
    refreshToken: string
    userId: string
    withCheck?: boolean
  }) {
    if (withCheck) {
      const tokenValid = await RefreshTokenManager.exists({
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
      invite: optionalString,
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
    runSchemaWithFormError(this.signupSchema, {
      username,
      email,
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

  static logout({ user, refreshToken }: { user: User; refreshToken: string }) {
    runSchemaWithFormError(requiredString, refreshToken)

    return RefreshTokenManager.destroy({ userId: user.id, key: refreshToken })
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

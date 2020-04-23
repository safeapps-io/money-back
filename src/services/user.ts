import * as yup from 'yup'
import { isBefore } from 'date-fns'

import User, { UserManager } from '@/models/user.model'
import { RefreshTokenManager } from '@/models/refreshToken.model'
import { FormValidationError } from '@/core/errors'
import { runSchemaWithFormError } from '@/utils/yupHelpers'
import { signJwt, verifyJwt } from '@/utils/crypto'
import { ValidateEmailService } from './validateEmail'
import { PasswordService, passwordScheme } from './password'
import { InviteService } from './invite'

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
    const token = await this.generateToken({
      refreshToken,
      userId,
      withCheck: false,
    })

    return { refreshToken, token }
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
      throw new FormValidationError(UserServiceFormErrors.usernameTaken)
    else if (emailTaken)
      throw new FormValidationError(UserServiceFormErrors.emailTaken)
  }

  private static signupSchema = yup.object({
    username: usernameScheme,
    email: emailScheme,
    password: passwordScheme,
  })
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

    await this.checkCredentialsAvailability({ username, email })
    const inviterId = await InviteService.getUserIdFromInvite(invite)

    const passwordHashed = await PasswordService.hashPassword(password)
    const user = await UserManager.createUser({
      username,
      password: passwordHashed,
      inviterId,
    })

    await ValidateEmailService.triggerEmailValidation(user, email)

    return { ...(await this.newSignIn({ userId: user.id, description })), user }
  }

  private static signinSchema = yup.object({
    usernameOrEmail: yup.string().required(),
    password: yup.string().required(),
  })
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

    const user = await UserManager.findUser(usernameOrEmail)
    if (!user) throw new FormValidationError(UserServiceFormErrors.unknownUser)

    await PasswordService.verifyPassword(user.password, password)

    return await this.newSignIn({ userId: user.id, description })
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
    const user = await UserManager.getUserById(decoded.id)

    if (!user) throw new InvalidToken()

    return user
  }

  private static updateUserScheme = yup.object({
    username: usernameScheme,
    email: emailScheme,
  })
  static async updateUser({
    user,
    username,
    email,
  }: {
    user: User
    username: string
    email?: string
  }) {
    runSchemaWithFormError(this.updateUserScheme, { email, username })

    if (user.email && !email)
      throw new FormValidationError(UserServiceFormErrors.cantDeleteEmail)

    await this.checkCredentialsAvailability({ username, excludeId: user.id })
    await ValidateEmailService.triggerEmailValidation(user, email)

    return UserManager.updateUser(user.id, { username })
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

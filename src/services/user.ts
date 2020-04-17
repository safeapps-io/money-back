import argon2 from 'argon2'
import * as yup from 'yup'
import { isBefore } from 'date-fns'

import User, { UserManager } from '@/models/user.model'
import { RefreshTokenManager } from '@/models/refreshToken.model'
import { FormValidationError } from '@/core/errors'
import { runSchemaWithFormError } from '@/utils/yupHelpers'
import { signJwt, verifyJwt } from '@/utils/asyncJwt'

type JWTMessage = {
  id: string
  exp?: number
  iat?: number
}

const passwordScheme = yup
    .string()
    .required()
    .min(6)
    .max(100),
  usernameScheme = yup
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
  private static hashPassword(rawPassword: string) {
    return argon2.hash(rawPassword)
  }

  private static verifyPassword(hashedPassword: string, password: string) {
    return argon2.verify(hashedPassword, password)
  }

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

    return signJwt(data, { expiresIn: '15m' })
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
  }: {
    username: string
    email?: string
    password: string
    description: string
  }) {
    runSchemaWithFormError(this.signupSchema, { username, email, password })

    await this.checkCredentialsAvailability({ username, email })

    const passwordHashed = await this.hashPassword(password)
    const user = await UserManager.createUser({
      email,
      username,
      password: passwordHashed,
    })

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

    const isCorrect = await this.verifyPassword(user.password, password)
    if (!isCorrect)
      throw new FormValidationError(UserServiceFormErrors.incorrectPassword)

    return await this.newSignIn({ userId: user.id, description })
  }

  static async getNewAccessToken(accessToken: string, refreshToken: string) {
    let decoded: JWTMessage
    try {
      decoded = await verifyJwt<JWTMessage>(accessToken, {
        ignoreExpiration: true,
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

  static async updatePassword({
    user,
    oldPassword,
    newPassword,
  }: {
    user: User
    oldPassword: string
    newPassword: string
  }) {
    runSchemaWithFormError(passwordScheme, newPassword)

    const isCorrect = await this.verifyPassword(user.password, oldPassword)
    if (!isCorrect)
      throw new FormValidationError(UserServiceFormErrors.incorrectOldPassword)

    const passwordHashed = await this.hashPassword(newPassword)
    await UserManager.changeUserPassword(user.id, passwordHashed)
  }

  private static updateUserScheme = yup.object({
    username: usernameScheme,
    email: emailScheme,
  })
  static async updateUser({
    user,
    ...obj
  }: {
    user: User
    username: string
    email?: string
  }) {
    runSchemaWithFormError(this.updateUserScheme, obj)

    if (user.email && !obj.email)
      throw new FormValidationError(UserServiceFormErrors.cantDeleteEmail)

    await this.checkCredentialsAvailability({ ...obj, excludeId: user.id })
    return UserManager.updateUser(user.id, obj)
  }
}

export enum UserServiceFormErrors {
  emailTaken = 'emailTaken',
  usernameTaken = 'usernameTaken',
  unknownUser = 'unknownUser',
  incorrectPassword = 'incorrectPassword',
  incorrectOldPassword = 'incorrectOldPassword',
  cantDeleteEmail = 'cantDeleteEmail',
}

export class AuthError extends Error {}
export class InvalidRefreshToken extends AuthError {}
export class InvalidToken extends AuthError {}
export class ExpiredToken extends AuthError {}

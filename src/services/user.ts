import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import * as yup from 'yup'
import { isBefore } from 'date-fns'

import User, { UserManager } from '@/models/user.model'
import { RefreshTokenManager } from '@/models/refreshToken.model'
import { FormValidationError } from '@/core/errors'
import { runSchemaWithFormError } from '@/utils/yupHelpers'

type JWTMessage = {
  id: string
  exp?: number
  iat?: number
}

const passwordScheme = yup
  .string()
  .required()
  .min(6)
  .max(100)

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

    return jwt.sign(data, process.env.SECRET as string, {
      expiresIn: '15m',
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

  private static signupSchema = yup.object({
    username: yup
      .string()
      .required()
      .min(5)
      .max(50),
    email: yup
      .string()
      .email()
      .notRequired()
      .nullable(),
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

    const promises = []
    promises.push(UserManager.isUsernameTaken(username))

    if (email) promises.push(UserManager.isEmailTaken(email))
    const [usernameTaken, emailTaken] = await Promise.all(promises)

    if (usernameTaken) throw new FormValidationError('Username is taken')
    else if (emailTaken) throw new FormValidationError('Email is taken')

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

  static getNewAccessToken(accessToken: string, refreshToken: string) {
    let decoded: JWTMessage
    try {
      decoded = jwt.verify(accessToken, process.env.SECRET as string, {
        ignoreExpiration: true,
      }) as JWTMessage
    } catch (err) {
      throw new InvalidToken()
    }
    return this.generateToken({ refreshToken, userId: decoded.id })
  }

  static async getUserFromToken(token: string) {
    let decoded: JWTMessage
    try {
      decoded = jwt.verify(token, process.env.SECRET as string, {
        ignoreExpiration: true,
      }) as JWTMessage
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
      throw new FormValidationError(
        UserServiceFormErrors.incorrect_old_password,
      )

    const passwordHashed = await this.hashPassword(newPassword)
    await UserManager.changeUserPassword(user.id, passwordHashed)
  }
}

export enum UserServiceFormErrors {
  unknownUser = 'unknownUser',
  incorrectPassword = 'incorrectPassword',
  incorrect_old_password = 'incorrectOldPassword',
}

export class AuthError extends Error {}
export class InvalidRefreshToken extends AuthError {}
export class InvalidToken extends AuthError {}
export class ExpiredToken extends AuthError {}

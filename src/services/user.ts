import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import * as yup from 'yup'
import { isBefore } from 'date-fns'

import { UserManager } from '@/models/user.model'
import { RefreshTokenManager } from '@/models/refreshToken.model'
import { FormValidationError } from '@/core/errors'
import { runSchemaWithFormError } from '@/utils/yupHelpers'

type JWTMessage = {
  id: string
  exp?: number
  iat?: number
}

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
    password: yup
      .string()
      .required()
      .min(6)
      .max(100),
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

    const passwordHashed = await argon2.hash(password)
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
    if (!user) throw new FormValidationError(UserServiceFormErrors.unknown_user)

    const isCorrect = await argon2.verify(user.password, password)
    if (!isCorrect)
      throw new FormValidationError(UserServiceFormErrors.incorrect_password)

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
}

export enum UserServiceFormErrors {
  unknown_user = 'unknown_user',
  incorrect_password = 'incorrect_password',
}

export class AuthError extends Error {}
export class InvalidRefreshToken extends AuthError {}
export class InvalidToken extends AuthError {}
export class ExpiredToken extends AuthError {}

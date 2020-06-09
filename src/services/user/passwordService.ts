import argon2 from 'argon2'
import * as yup from 'yup'

import { runSchemaWithFormError } from '@/utils/yupHelpers'
import { signJwt, verifyJwt } from '@/utils/crypto'

import User, { UserManager } from '@/models/user.model'

import { FormValidationError } from '@/services/errors'
import { MessageService } from '../message'

export const passwordScheme = yup.string().required().min(6).max(100)

export const jwtSubject = 'pre' // Password REset

type JWTMessage = {
  id: string
}

export class PasswordService {
  public static async verifyPassword(hashedPassword: string, password: string) {
    try {
      const isValid = await argon2.verify(hashedPassword, password)
      if (!isValid) throw new Error()
    } catch (error) {
      throw new FormValidationError(
        PasswordServiceFormErrors.incorrectPassword,
        { password: [PasswordServiceFormErrors.incorrectPassword] },
      )
    }
  }

  public static async hashPassword(rawPassword: string, withValidation = true) {
    if (withValidation) runSchemaWithFormError(passwordScheme, rawPassword)

    return argon2.hash(rawPassword)
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

    await this.verifyPassword(user.password, oldPassword)

    const passwordHashed = await this.hashPassword(newPassword)
    await UserManager.changeUserPassword(user.id, passwordHashed)
  }

  public static async requestPasswordReset(email: string) {
    const user = await UserManager.findByEmailOrUsername(email)
    if (!user || !user.email)
      throw new FormValidationError(PasswordServiceFormErrors.resetNoEmail, {
        email: [PasswordServiceFormErrors.resetNoEmail],
      })

    const token = await signJwt(
      { id: user.id },
      { expiresIn: '2h', subject: jwtSubject },
    )
    return MessageService.sendPasswordResetEmail({ email: user.email, token })
  }

  public static async getUserIdFromPasswordResetToken(
    token: string,
  ): Promise<string> {
    try {
      const { id } = await verifyJwt<JWTMessage>(token, { subject: jwtSubject })
      return id
    } catch (error) {
      throw new FormValidationError(PasswordServiceFormErrors.resetInvalidToken)
    }
  }

  public static async updatePasswordFromResetToken({
    token,
    password,
  }: {
    token: string
    password: string
  }) {
    runSchemaWithFormError(passwordScheme, password)

    const userId = await this.getUserIdFromPasswordResetToken(token),
      hashedPassword = await this.hashPassword(password)
    return UserManager.changeUserPassword(userId, hashedPassword)
  }
}

export enum PasswordServiceFormErrors {
  incorrectPassword = 'incorrectPassword',
  resetNoEmail = 'resetNoEmail',
  resetInvalidToken = 'resetInvalidToken',
}

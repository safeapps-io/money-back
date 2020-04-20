import argon2 from 'argon2'
import * as yup from 'yup'
import { runSchemaWithFormError } from '@/utils/yupHelpers'
import User, { UserManager } from '@/models/user.model'
import { FormValidationError } from '@/core/errors'

export const passwordScheme = yup
  .string()
  .required()
  .min(6)
  .max(100)

export class PasswordService {
  public static async verifyPassword(hashedPassword: string, password: string) {
    try {
      const isValid = await argon2.verify(hashedPassword, password)
      if (!isValid) throw new Error()
    } catch (error) {
      throw new FormValidationError(PasswordServiceFormErrors.incorrectPassword)
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
}

export enum PasswordServiceFormErrors {
  incorrectPassword = 'incorrectPassword',
}

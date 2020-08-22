import User, { UserManager } from '@/models/user.model'
import { signJwt, verifyJwt } from '@/utils/crypto'
import { FormValidationError } from '@/services/errors'
import { MessageService } from '../message'
import { UserUpdatesPubSubService } from './userUpdatesPubSubService'

export const jwtSubject = 'vem' // Validate EMail

type JWTMessage = {
  id: string
  // email
  em: string

  exp?: number
  iat?: number
}

type UserData = {
  email: string
  userId: string
}

export class ValidateEmailService {
  private static generateToken({ email, userId }: UserData): Promise<string> {
    return signJwt({ em: email, id: userId } as JWTMessage, {
      expiresIn: '2d',
      subject: jwtSubject,
    })
  }

  private static async isEmailTaken(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const emailTaken = await UserManager.isEmailTaken(email, excludeId)
    if (emailTaken)
      throw new FormValidationError(ValidateEmailServiceErrors.emailTaken)
  }

  public static async validateToken(token: string): Promise<UserData> {
    try {
      const { em, id } = await verifyJwt<JWTMessage>(token, {
        subject: jwtSubject,
      })
      return { email: em, userId: id }
    } catch (error) {
      throw new FormValidationError(ValidateEmailServiceErrors.invalidToken)
    }
  }

  public static async triggerEmailValidation(
    user: User,
    newEmail?: string,
  ): Promise<void> {
    if (!newEmail || user.email === newEmail) return
    await this.isEmailTaken(newEmail)

    const token = await this.generateToken({ email: newEmail, userId: user.id })
    return MessageService.sendValidationEmail({ email: newEmail, token })
  }

  public static async updateEmail(token: string): Promise<User> {
    const { email, userId } = await this.validateToken(token)

    // Excluding id in case user clicks on the link multiple times
    await this.isEmailTaken(email, userId)
    const res = await UserManager.update(userId, { email })

    await UserUpdatesPubSubService.publishUserUpdates({ user: res })
    return res
  }
}

export enum ValidateEmailServiceErrors {
  invalidToken = 'invalidToken',
  emailTaken = 'emailTaken',
}

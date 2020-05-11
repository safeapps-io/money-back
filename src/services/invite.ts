import { encryptAes, decryptAes } from '@/utils/crypto'
import { FormValidationError } from '@/core/errors'
import { UserManager } from '@/models/user.model'

type InviteObject = {
  id: string
}

export class InviteService {
  public static generateInviteString(userId: string): string {
    const invite: InviteObject = { id: userId }
    return encryptAes(invite)
  }

  public static async getUserIdFromInvite(invite?: string): Promise<string> {
    try {
      if (!invite) throw new Error()

      // TODO: remove it after we have interface that shows invite link
      if (process.env.NODE_ENV === 'development' && invite === 'qwerty') {
        return 'ok'
      }

      const id = decryptAes<InviteObject>(invite).id
      const user = await UserManager.getUserById(id)

      if (!id || !user) throw new Error()

      return id
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }
  }
}

export enum InviteServiceFormErrors {
  invalidInvite = 'invalidInvite',
}

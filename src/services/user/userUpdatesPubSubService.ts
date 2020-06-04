import User from '@/models/user.model'
import { UserPubSubService, UserPubSubMessageTypes } from './userPubSubService'

/**
 * Handles user model updating.
 */
export class UserUpdatesPubSubService {
  static async publishUserUpdates({
    socketId,
    user,
  }: {
    socketId?: string
    user: User
  }) {
    return UserPubSubService.publishForUser({
      userId: user.id,
      socketId,
      type: UserPubSubMessageTypes.userUpdates,
      data: User,
    })
  }
}

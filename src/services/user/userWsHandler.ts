import { WSMiddleware } from '@/utils/wsMiddleware'

import { UserPubSubService, UserPubSubMessageTypes } from './userPubSubService'
import { UserService } from './userService'
import { DefaultWsState } from '@/services/types'

enum ClientTypes {
  newAccessToken = 'user/newAccessToken',
  incrementalUpdate = 'user/incrementalUpdate',
}

export type UserIncomingMessages = {
  [ClientTypes.newAccessToken]: { accessToken: string; refreshToken: string }
  [ClientTypes.incrementalUpdate]:
    | { encr: string; clientUpdated: number }
    | undefined
}

enum BackTypes {
  data = 'user/data',
  newAccessToken = 'user/newAccessToken',
}

const pubSubPurpose = 'user'

type M = WSMiddleware<UserIncomingMessages, DefaultWsState>
export class UserWsMiddleware implements M {
  static bulk: M['bulk'] = async ({ wsWrapped, parsed }) => {
    const { token } = parsed
    try {
      const user = await UserService.getUserFromToken(token!)
      wsWrapped.state.user = user
    } catch (error) {
      // User is unauthorized, which is ok, we just don't push any state about the user
    }
  }

  static [ClientTypes.newAccessToken]: M[ClientTypes.newAccessToken] = async ({
    wsWrapped,
    message,
  }) => {
    const { accessToken, refreshToken } = message
    const token = await UserService.getNewAccessToken(accessToken, refreshToken)
    wsWrapped.send({ type: BackTypes.newAccessToken, data: token })
  }

  static [ClientTypes.incrementalUpdate]: M[ClientTypes.incrementalUpdate] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    const res = await UserService.incrementalUserUpdate({
      user: wsWrapped.state.user,
      data: message,
      socketId: wsWrapped.id,
    })
    wsWrapped.send({ type: BackTypes.data, data: res })

    return UserPubSubService.subscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
      purpose: pubSubPurpose,
      callback: ({ type, data }) => {
        switch (type) {
          case UserPubSubMessageTypes.userData:
            wsWrapped.send({ type: BackTypes.data, data })
            break
        }
      },
    })
  }

  static close: M['close'] = async (wsWrapped) => {
    if (!wsWrapped.state.user) return void 0

    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

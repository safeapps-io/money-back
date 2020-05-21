import { WSMiddleware } from '@/utils/wsMiddleware'
import { UserPubSubService } from './userPubSubService'
import { UserService } from './userService'
import { DefaultWsState } from '@/services/types'

enum ITypes {
  getNewAccessToken = 'getNewAccessToken',
  mergeUser = 'mergeUser',
}

export type UserIncomingMessages = {
  [ITypes.getNewAccessToken]: { accessToken: string; refreshToken: string }
  [ITypes.mergeUser]: { encr: string; clientUpdated: number } | undefined
}

enum OTypes {
  userData = 'userData',
  newAccessToken = 'newAccessToken',
}

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

  static [ITypes.getNewAccessToken]: M[ITypes.getNewAccessToken] = async ({
    wsWrapped,
    message,
  }) => {
    const { accessToken, refreshToken } = message
    const token = await UserService.getNewAccessToken(accessToken, refreshToken)
    wsWrapped.send({ type: OTypes.newAccessToken, data: token })
  }

  static [ITypes.mergeUser]: M[ITypes.mergeUser] = async ({
    wsWrapped,
    message,
  }) => {
    if (!wsWrapped.state.user) return

    const res = await UserService.incrementalUserUpdate({
      user: wsWrapped.state.user,
      data: message,
    })
    wsWrapped.send({ type: OTypes.userData, data: res })

    await UserPubSubService.subscribeUserUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
      callback: user => {
        wsWrapped.send({ type: OTypes.userData, data: user })
      },
    })
  }

  static close: M['close'] = async wsWrapped => {
    if (!wsWrapped.state.user) return void 0

    return UserPubSubService.unsubscribeUserUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
  }
}

import { WSMiddleware } from '@/utils/wsMiddleware'
import { UserPubSubService } from './userPubSubService'
import { UserService } from './userService'

enum ITypes {
  getNewAccessToken = 'getNewAccessToken',
  getUser = 'getUser',
}

export type UserIncomingMessages = {
  [ITypes.getNewAccessToken]: { accessToken: string; refreshToken: string }
  [ITypes.getUser]: {}
}

enum OTypes {
  userData = 'userData',
  newAccessToken = 'newAccessToken',
}

type M = WSMiddleware<UserIncomingMessages>
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

  static [ITypes.getUser]: M[ITypes.getUser] = async ({ wsWrapped }) => {
    const fetchedUser = await UserService.fetchUserById(wsWrapped.state.user.id)
    wsWrapped.send({ type: OTypes.userData, data: fetchedUser })

    await UserPubSubService.subscribeUserUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
      callback: user => {
        wsWrapped.send({ type: OTypes.userData, data: user })
      },
    })
  }

  static close: M['close'] = async wsWrapped =>
    UserPubSubService.unsubscribeUserUpdates({
      socketId: wsWrapped.id,
      userId: wsWrapped.state.user.id,
    })
}

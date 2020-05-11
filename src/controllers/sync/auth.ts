import { WSMiddleware } from '@/utils/wsMiddleware'
import { UserService } from '@/services/user'

enum ITypes {
  getNewAccessToken = 'getNewAccessToken',
}

export type AuthIncomingMessages = {
  [ITypes.getNewAccessToken]: { accessToken: string; refreshToken: string }
}

enum OTypes {
  newAccessToken = 'newAccessToken',
}

type M = WSMiddleware<AuthIncomingMessages>
export class AuthWsMiddleware implements M {
  static bulk: M['bulk'] = async ({ parsed, state }) => {
    const { token } = parsed
    try {
      const user = await UserService.getUserFromToken(token!)
      state.user = user
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
}

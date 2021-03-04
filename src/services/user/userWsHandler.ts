import { WSMiddleware } from '@/utils/wsMiddleware'

import { UserPubSubService, UserPubSubMessageTypes } from './userPubSubService'
import { UserService } from './userService'
import { DefaultWsState } from '@/services/types'

enum ClientTypes {
  incrementalUpdate = 'user/incrementalUpdate',
}

export type UserIncomingMessages = {
  [ClientTypes.incrementalUpdate]:
    | { encr: string; clientUpdated: number }
    | undefined
}

enum BackTypes {
  data = 'user/data',
}

const pubSubPurpose = 'user'

type M = WSMiddleware<UserIncomingMessages, DefaultWsState>
export class UserWsMiddleware implements M {
  static [ClientTypes.incrementalUpdate]: M[ClientTypes.incrementalUpdate] = async ({
    wsWrapped,
    message,
  }) => {
    const res = await UserService.incrementalUserUpdate({
      user: wsWrapped.user,
      data: message,
      socketId: wsWrapped.id,
    })
    wsWrapped.send({ type: BackTypes.data, data: res })

    return UserPubSubService.subscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.user.id,
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
    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.user.id,
    })
  }
}

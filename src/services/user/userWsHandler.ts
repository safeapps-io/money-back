import { WSMiddleware } from '@/utils/wsMiddleware'

import { UserPubSubService, UserPubSubMessageTypes } from './userPubSubService'
import { UserService } from './userService'
import { DefaultWsState } from '@/services/types'
import { UserManager } from '@/models/user.model'
import { serializeModel, Serializers } from '@/models/serializers'

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
    const user = (await UserManager.byId(wsWrapped.userId))!

    const res = await UserService.incrementalUserUpdate({
      user,
      data: message,
      socketId: wsWrapped.id,
    })
    wsWrapped.send({
      type: BackTypes.data,
      data: serializeModel(res, Serializers.userFull),
    })

    return UserPubSubService.subscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.userId,
      purpose: pubSubPurpose,
      callback: ({ type, data }) => {
        switch (type) {
          case UserPubSubMessageTypes.userData:
            wsWrapped.send({
              type: BackTypes.data,
              data: serializeModel(data, Serializers.userFull),
            })
            break
        }
      },
    })
  }

  static close: M['close'] = async (wsWrapped) => {
    return UserPubSubService.unsubscribeSocketForUser({
      socketId: wsWrapped.id,
      userId: wsWrapped.userId,
    })
  }
}

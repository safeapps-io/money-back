const enum MessageTypes {
  ping = 'ping',
}

type UserDataEvent = { type: MessageTypes.ping; data: { timer: number } }

export const pingEventSender = async (
  _: string,
  __: string,
  send: SSESender,
) => {
  const timer = 10000,
    data: UserDataEvent = {
      type: MessageTypes.ping,
      data: { timer },
    },
    interval = setInterval(() => send(data), timer)
  send(data)

  return async () => clearInterval(interval)
}

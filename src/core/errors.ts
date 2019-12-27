export class RequestError extends Error {
  constructor(message: string, public code: number) {
    super(message)
  }
}

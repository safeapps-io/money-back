export class RequestError extends Error {
  constructor(message: string, public code: number, ...args: any[]) {
    super(message)
  }
}

export class FormValidationError extends RequestError {
  constructor(
    message: string,
    public fieldErrors: { [field: string]: string[] },
  ) {
    super(message, 400)
  }
}

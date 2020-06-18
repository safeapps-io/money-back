export class RequestError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message)
  }
}

export class FormValidationError extends Error {
  public code = 400

  constructor(
    message: string,
    public fieldErrors?: { [field: string]: string[] },
  ) {
    super(message)
  }
}

export class AccessError extends Error {}

// (c) https://stackoverflow.com/a/57364353/3720087

import { NextFunction, Request, Response } from 'express'

declare global {
  type Await<T> = T extends {
    then(onfulfilled?: (value: infer U) => unknown): unknown
  }
    ? U
    : T

  type Handler = (req: Request, res: Response, next: NextFunction) => any
}

export {}

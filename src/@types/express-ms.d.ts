import { IncomingMessage } from 'http'
import { Router, NextFunction } from 'express'
import { PathParams } from 'express-serve-static-core'
import * as ws from 'ws'

type WSHandler = (ws: ws, req: IncomingMessage, next: NextFunction) => void

type EnchancedRouter = Router & {
  ws: (path: PathParams, ...handler: WSHandler[]) => EnchancedRouter
}

/**
 * Typings for express-ms doesn't work for me for some reason. Gonna open an issue in DefinitelyTyped in future.
 */
declare module 'express' {
  export function Router(options?: RouterOptions): EnchancedRouter
}

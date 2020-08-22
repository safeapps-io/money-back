import pino from 'express-pino-logger'
import { nanoid } from 'nanoid'

const logger = pino({ autoLogging: false, genReqId: () => nanoid() })

export default logger

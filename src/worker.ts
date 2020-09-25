import dotenv from 'dotenv'
dotenv.config()

import { setupEmailTransportWorker } from '@/services/message/emailTransport'

setupEmailTransportWorker()

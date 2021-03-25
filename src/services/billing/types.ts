import { Request } from 'express'

import { EventTypes } from '@/models/billing/chargeEvent.model'
import Product from '@/models/billing/product.model'

export type EventHandlerContext = {
  rawRequestData: string
  headers: Request['headers']
}
export type ChargeEventData = {
  eventType: EventTypes
  remoteChargeId: string
  rawData: string
}

export interface BillingProvider {
  createCharge: (
    product: Product,
    userId: string,
    subscriptionId: string,
  ) => Promise<Omit<ChargeEventData, 'eventType'>>
  handleEvent: (
    event: any,
    context: EventHandlerContext,
  ) => Promise<ChargeEventData | null>
}

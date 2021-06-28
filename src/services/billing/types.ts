import { Request } from 'express'

import { EventTypes } from '@/models/billing/chargeEvent.model'
import Product, { ProductType } from '@/models/billing/product.model'

export type EventHandlerContext = {
  rawRequestData: string
  headers: Request['headers']
}
export type ChargeEventData = {
  id?: string
  eventType: EventTypes
  remoteChargeId: string
  rawData: string
}

export interface BillingProvider {
  createCharge: (
    product: Product,
    userId: string,
    subscriptionId: string,
  ) => Promise<{
    chargeData: Omit<ChargeEventData, 'eventType'>
    sendToClient: any
  }>
  handleEvent: (event: any, context: EventHandlerContext) => Promise<ChargeEventData | null>
}

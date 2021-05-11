import { Client, Webhook, resources } from 'coinbase-commerce-node'

import Product from '@/models/billing/product.model'
import { EventTypes } from '@/models/billing/chargeEvent.model'
import { BillingProvider, EventHandlerContext } from './types'

Client.init(process.env.COINBASE_KEY as string)
const Charge = resources.Charge

export type CoinbaseClientDataReturn = { link: string }

class CoinbaseProvider implements BillingProvider {
  async createCharge(product: Product, userId: string, planId: string) {
    // For test products we cut down the price to 1 cent, lowest possible
    const amount = (product.isTest ? 0.01 : product.price / 100).toString()

    const res = await Charge.create({
      name: product.title,
      description: product.description,
      local_price: {
        amount,
        currency: 'USD',
      },
      pricing_type: 'fixed_price',
      metadata: { userId, planId },
    })
    const chargeData = {
        remoteChargeId: res.id,
        rawData: JSON.stringify(res),
      },
      sendToClient: CoinbaseClientDataReturn = { link: res.hosted_url }

    return { chargeData, sendToClient }
  }

  async handleEvent(event: resources.Event, context: EventHandlerContext) {
    try {
      Webhook.verifyEventBody(
        context.rawRequestData,
        context.headers['x-cc-webhook-signature'] as string,
        process.env.COINBASE_WEBHOOK_SECRET as string,
      )
    } catch (error) {
      return null
    }

    let eventType: EventTypes
    switch (event.type) {
      case 'charge:resolved':
      case 'charge:created':
      default:
        return null

      case 'charge:confirmed':
        eventType = EventTypes.confirmed
        break

      case 'charge:failed':
        eventType = EventTypes.failed
        break

      case 'charge:delayed':
      case 'charge:pending':
        eventType = EventTypes.pending
    }

    return {
      eventType,
      remoteChargeId: event.data.id,
      rawData: JSON.stringify(event.data),
    }
  }
}

export const coinbaseProvider = new CoinbaseProvider()

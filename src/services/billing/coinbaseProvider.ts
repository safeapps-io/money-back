import { Client, Webhook, resources } from 'coinbase-commerce-node'

import Product from '@/models/billing/product.model'
import { EventTypes } from '@/models/billing/chargeEvent.model'
import { BillingProvider, EventHandlerContext } from './types'

Client.init(process.env.COINBASE_KEY as string)
const Charge = resources.Charge

class CoinbaseProvider implements BillingProvider {
  async createCharge(product: Product, userId: string, planId: string) {
    const res = await Charge.create({
      name: product.title,
      description: product.description,
      local_price: {
        amount: (product.price / 100).toString(),
        currency: 'USD',
      },
      pricing_type: 'fixed_price',
      metadata: { userId, planId },
    })
    return { remoteChargeId: res.id, rawData: JSON.stringify(res) }
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

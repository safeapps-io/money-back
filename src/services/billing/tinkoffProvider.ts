import productModel from '@/models/billing/product.model'
import { BillingProvider, EventHandlerContext } from './types'
import { CryptoService } from '@/services/crypto/cryptoService'
import { request } from '@/services/request'
import { EventTypes } from '@/models/billing/chargeEvent.model'

class TinkoffProvider implements BillingProvider {
  private endpoint = 'https://securepay.tinkoff.ru/v2/'

  /**
   * Request signing. Used both to send out requests (don't understand what for) and to verify
   * incoming webhook requests.
   *
   * Detailed process is outlined here: https://oplata.tinkoff.ru/develop/api/request-sign/
   */
  private getToken(data: Object): string {
    const dataWithPass = { ...data, Password: process.env.TINKOFF_PASSWORD },
      valuesJoined = Object.entries(dataWithPass)
        .filter(([key]) => !['Receipt', 'DATA', 'Token'].includes(key))
        .sort(([key1], [key2]) => key1.localeCompare(key2))
        .map(([_, value]) => value)
        .join('')

    return CryptoService.getDigest(valuesJoined)
  }

  async createCharge(product: productModel, userId: string, planId: string) {
    const body: {
        TerminalKey: string
        Amount: number
        OrderId: string
        Language: 'ru' | 'en'
        DATA: { [key: string]: string }
      } = {
        TerminalKey: process.env.TINKOFF_TERMINAL_KEY as string,
        // FIXME: pull exchange rates from some place
        Amount: product.price * 76,
        OrderId: planId,
        Language: 'en',
        DATA: { planId, userId },
      },
      token = this.getToken(body)

    const { json } = await request<InitResponse>({
      method: 'POST',
      path: this.endpoint + 'Init',
      data: { ...body, Token: token },
    })

    if (!json.Success) {
      throw new Error(`[${json.ErrorCode}] ${json.Message}: ${json.Details}`)
    }

    return {
      remoteChargeId: json.PaymentId.toString(),
      rawData: JSON.stringify(json),
    }
  }

  async handleEvent(event: Event, _: EventHandlerContext) {
    const checkToken = this.getToken(event)
    if (checkToken !== event.Token) return null

    let eventType: EventTypes
    switch (event.Status) {
      case TinkoffEventTypes.confirm:
        eventType = EventTypes.confirmed
        break

      case TinkoffEventTypes.refund:
        eventType = EventTypes.refunded
        break

      case TinkoffEventTypes.reject:
        eventType = EventTypes.failed
        break

      default:
        return null
    }

    return {
      eventType,
      remoteChargeId: event.PaymentId.toString(),
      rawData: JSON.stringify(event),
    }
  }
}

export const tinkoffProvider = new TinkoffProvider()

enum TinkoffEventTypes {
  confirm = 'CONFIRMED',
  refund = 'REFUNDED',
  reject = 'REJECTED',
}

type Event = {
  TerminalKey: string
  OrderId: string
  Success: boolean
  Status: TinkoffEventTypes
  PaymentId: number
  ErrorCode: string | '0'
  Amount: number
  CardId: number
  Pan: string
  ExpDate: string
  Token: string
}

type InitResponse = {
  TerminalKey: string
  PaymentId: number
  OrderId: string
  Amount: number
  PaymentURL: string
} & (
  | {
      Success: false
      ErrorCode: string
      Message: string
      Details: string
    }
  | {
      Success: true
      Status: string
      PaymentURL: string
    }
)

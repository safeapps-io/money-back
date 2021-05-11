import { nanoid } from 'nanoid'

import Product from '@/models/billing/product.model'
import { BillingProvider, EventHandlerContext } from './types'
import { CryptoService } from '@/services/crypto/cryptoService'
import { request } from '@/services/request'
import { EventTypes } from '@/models/billing/chargeEvent.model'
import { ExchangeRateService } from './exchangeRate'

export type TinkoffClientDataReturn = {
  link: string
  price: number
  exchangeRate: number
}

class TinkoffProvider implements BillingProvider {
  private endpoint = 'https://securepay.tinkoff.ru/v2/'

  /**
   * Request signing. Used both to send out requests (don't understand what for) and to verify
   * incoming webhook requests.
   *
   * Detailed process is outlined here: https://oplata.tinkoff.ru/develop/api/request-sign/
   */
  private getToken(data: Object, password: string): string {
    const dataWithPass = { ...data, Password: password },
      valuesJoined = Object.entries(dataWithPass)
        .filter(([key]) => !['Receipt', 'DATA', 'Token'].includes(key))
        .sort(([key1], [key2]) => key1.localeCompare(key2))
        .map(([_, value]) => value)
        .join('')

    return CryptoService.getDigest(valuesJoined)
  }

  async createCharge(product: Product, userId: string, planId: string) {
    // Tinkoff requires each order to have a unique ID
    const currentRate = await ExchangeRateService.getExchangeRate()
    /**
     * Making the price round to 10 rubles for the beauty of it.
     * `product.price` is cents, and we need to pass the price in kopeykas, so
     * multiply/divide by 1000.
     */
    const price = Math.floor((product.price * currentRate) / 1000) * 1000

    // For test products we switch to test terminal that do not initiate
    // real purchases
    const { TerminalKey, password } = this.getPrivateDataByProduct(product)

    const orderId = nanoid(),
      body: {
        TerminalKey: string
        Amount: number
        OrderId: string
        Language: 'ru' | 'en'
        DATA: { [key: string]: string }
      } = {
        TerminalKey,
        Amount: price,
        OrderId: orderId,
        Language: 'en',
        DATA: { planId, userId },
      },
      token = this.getToken(body, password)

    const { json } = await request<InitResponse>({
      method: 'POST',
      path: this.endpoint + 'Init',
      data: { ...body, Token: token },
    })

    if (!json.Success) {
      throw new Error(`[${json.ErrorCode}] ${json.Message}: ${json.Details}`)
    }

    const chargeData = {
        id: orderId,
        remoteChargeId: json.PaymentId.toString(),
        rawData: JSON.stringify(json),
      },
      sendToClient: TinkoffClientDataReturn = {
        link: json.PaymentURL,
        // Changing the price back to rubles instead of cents
        price: price / 100,
        exchangeRate: currentRate,
      }

    return { chargeData, sendToClient }
  }

  async handleEvent(event: Event, _: EventHandlerContext) {
    const password = this.getPasswordByTerminalKey(event.TerminalKey),
      checkToken = this.getToken(event, password)
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

  private getPrivateDataByProduct(product: Product) {
    return {
      TerminalKey: (product.isTest
        ? process.env.TINKOFF_TERMINAL_KEY_TEST
        : process.env.TINKOFF_TERMINAL_KEY) as string,
      password: (product.isTest
        ? process.env.TINKOFF_PASSWORD_TEST
        : process.env.TINKOFF_PASSWORD) as string,
    }
  }

  private getPasswordByTerminalKey(termKey: string) {
    switch (termKey) {
      case process.env.TINKOFF_TERMINAL_KEY:
        return process.env.TINKOFF_PASSWORD as string

      case process.env.TINKOFF_TERMINAL_KEY_TEST:
        return process.env.TINKOFF_PASSWORD_TEST as string

      default:
        throw new Error('Unknown terminal key')
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

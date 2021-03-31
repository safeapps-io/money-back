import { Request } from 'express'
import { addDays, isAfter, isBefore } from 'date-fns'

import ChargeEvent, {
  ChargeEventManager,
  EventChargeData,
  ChargeProviders,
  ChargeTypes,
  EventTypes,
} from '@/models/billing/chargeEvent.model'
import Plan, { PlanManager } from '@/models/billing/plan.model'
import User, { UserManager } from '@/models/user.model'
import Wallet from '@/models/wallet.model'
import { ProductManager, ProductType } from '@/models/billing/product.model'
import { getTransaction } from '@/models/setup'

import { BillingJWTAddition, ChargeEventData } from './types'
import { coinbaseProvider } from './coinbaseProvider'
import { tinkoffProvider } from './tinkoffProvider'

export class BillingService {
  private static async updatePlanAccordingToCharge(
    plan: Plan,
    charge: ChargeEvent,
  ) {
    if (charge.eventType != EventTypes.confirmed) return

    const expiredOld = plan.expires || new Date()

    let expiredNew: Date
    switch (charge.chargeType) {
      case ChargeTypes.trial: {
        const product = await ProductManager.byId(plan.productId)
        expiredNew = addDays(expiredOld, product!.trialDuration)
        break
      }

      case ChargeTypes.purchase: {
        const product = await ProductManager.byId(plan.productId)
        expiredNew = addDays(expiredOld, product!.duration)
        break
      }

      case ChargeTypes.manual:
        expiredNew = charge.expiredNew!
        break

      case ChargeTypes.viral: {
        const product = await ProductManager.byId(charge.productId!)
        expiredNew = addDays(expiredOld, product!.duration)
        break
      }

      default:
        throw new Error(`unknown charge type: ${charge.chargeType}`)
    }

    plan.expires = expiredNew
    charge.expiredNew = expiredNew
    charge.expiredOld = expiredOld

    await Promise.all([plan.save(), charge.save()])
    return { plan, charge }
  }

  private static async createPlan(user: User) {
    return getTransaction(async () => {
      const product = await (isBefore(
        user.created,
        new Date(process.env.PROD_BILLING_LAUNCH_TS as string),
      )
        ? ProductManager.getBySlug('money:early_bird')
        : ProductManager.getDefaultProduct())

      const _plan = await PlanManager.create(user.id, product!.id)

      return (await this.updatePlanAccordingToCharge(
        _plan,
        await ChargeEventManager.create({
          eventType: EventTypes.confirmed,
          chargeType: ChargeTypes.trial,
          planId: _plan.id,
        }),
      ))!.plan
    })
  }

  static isMoneySubscriptionActive(wallet: Wallet) {
    return wallet?.users.some((user) =>
      user?.plans.some(
        (plan) =>
          plan?.product.productType == ProductType.money &&
          plan.expires &&
          isAfter(plan.expires, new Date()),
      ),
    )
  }

  static async getPlanByUserId(
    userId: string,
    productType = ProductType.money,
  ) {
    return getTransaction(async () => {
      let plan = await PlanManager.byUserId(userId, productType)
      if (!plan) plan = await this.createPlan((await UserManager.byId(userId))!)

      return plan
    })
  }

  static async getFullPlanDataByUserId(
    userId: string,
    productType = ProductType.money,
  ) {
    return getTransaction(async () => {
      let res = await PlanManager.byUserId(userId, productType, true)
      if (!res) {
        await this.getPlanByUserId(userId, productType)
        res = (await PlanManager.byUserId(userId, productType, true))!
      }
      return res
    })
  }

  private static createChargeEvent(event: EventChargeData, plan: Plan) {
    return getTransaction(async () => {
      const charge = await ChargeEventManager.create(event)
      return this.updatePlanAccordingToCharge(plan, charge)
    })
  }

  static async createCharge(
    userId: string,
    provider: string,
    productType = ProductType.money,
  ) {
    return getTransaction(async () => {
      const plan = await this.getPlanByUserId(userId, productType)

      let remoteChargeData: Omit<ChargeEventData, 'eventType'>
      if (provider === ChargeProviders.coinbase)
        remoteChargeData = await coinbaseProvider.createCharge(
          plan.product,
          userId,
          plan.id,
        )
      else if (provider === ChargeProviders.tinkoff)
        remoteChargeData = await tinkoffProvider.createCharge(
          plan.product,
          userId,
          plan.id,
        )
      else throw new Error('Unknown provider')

      return this.createChargeEvent(
        {
          provider,
          planId: plan.id,
          productId: plan.product.id,
          eventType: EventTypes.created,
          chargeType: ChargeTypes.purchase,
          ...remoteChargeData!,
        },
        plan,
      )
    })
  }

  static async handleEvent({
    provider,
    event,
    ...context
  }: {
    provider: string
    event: any
    rawRequestData: string
    headers: Request['headers']
  }) {
    let remoteChargeData: ChargeEventData | null = null
    if (provider === ChargeProviders.coinbase)
      remoteChargeData = await coinbaseProvider.handleEvent(event, context)
    else if (provider === ChargeProviders.tinkoff)
      remoteChargeData = await tinkoffProvider.handleEvent(event, context)
    else throw new Error('Unknown provider')

    if (!remoteChargeData) return

    return getTransaction(async () => {
      const plan = await PlanManager.byRemoteChargeId(
        remoteChargeData!.remoteChargeId,
      )

      if (!plan) return

      return this.createChargeEvent(
        {
          provider,
          planId: plan.id,
          productId: plan.product.id,
          chargeType: ChargeTypes.purchase,
          ...remoteChargeData!,
        },
        plan,
      )
    })
  }

  static async getJWTAddition(userId: string) {
    const plans = await PlanManager.allByUserId(userId)

    return plans.reduce((acc, curr) => {
      const expires = curr.expires?.getTime() || 0
      if (acc?.[curr.product.productType] < expires)
        acc[curr.product.productType] = expires

      return acc
    }, {} as BillingJWTAddition)
  }
}

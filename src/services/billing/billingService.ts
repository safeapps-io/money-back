import { Request } from 'express'
import { addDays, isAfter, isBefore } from 'date-fns'
import _ from 'lodash'

import { copy } from '@/utils/copy'

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

import { MessageService } from '@/services/message/messageService'
import { WalletService } from '@/services/wallet/walletService'
import { BillingJWTAddition, ChargeEventData } from './types'
import { coinbaseProvider } from './coinbaseProvider'
import { tinkoffProvider } from './tinkoffProvider'
import { BillingPubSubService } from './billingPubSubService'

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
        expiredNew = addDays(expiredOld, product!.trialDuration || 0)
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

  private static async informUserAboutCharge(
    userId: string,
    chargeEvent: ChargeEvent,
  ) {
    const userWallets = await WalletService.getUserWallets(userId),
      relatedUserIds = [
        ...new Set(
          userWallets
            .filter((wallet) => WalletService.isUserOwner({ wallet, userId }))
            .flatMap((wallet) => wallet.users.map((user) => user.id)),
        ),
      ]
    return BillingPubSubService.publishChargedata({
      chargeEvent,
      relatedUserIds,
    })
  }

  static async createCharge(
    userId: string,
    provider: string,
    productType = ProductType.money,
  ) {
    return getTransaction(async () => {
      const plan = await this.getPlanByUserId(userId, productType)

      let providerResult: Await<ReturnType<
        | typeof tinkoffProvider['createCharge']
        | typeof coinbaseProvider['createCharge']
      >>
      if (provider === ChargeProviders.coinbase)
        providerResult = await coinbaseProvider.createCharge(
          plan.product,
          userId,
          plan.id,
        )
      else if (provider === ChargeProviders.tinkoff)
        providerResult = await tinkoffProvider.createCharge(
          plan.product,
          userId,
          plan.id,
        )
      else throw new Error('Unknown provider')

      const result = (await this.createChargeEvent(
        {
          provider,
          planId: plan.id,
          productId: plan.product.id,
          eventType: EventTypes.created,
          chargeType: ChargeTypes.purchase,
          ...providerResult.chargeData,
        },
        plan,
      ))!

      if (result) await this.informUserAboutCharge(userId, result.charge)

      return providerResult.sendToClient
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

    const res = await getTransaction(async () => {
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

    if (res?.plan.userId) {
      const promises: Promise<any>[] = [
        this.informUserAboutCharge(res.plan.userId, res.charge),
      ]

      if (res.charge.eventType === EventTypes.confirmed && res.plan.user?.email)
        promises.push(
          MessageService.sendSuccessfulPurchaseEmail(res.plan.user.email),
        )

      return Promise.all(promises)
    }
  }

  static async getJWTAddition(userId: string): Promise<BillingJWTAddition> {
    const plan = await this.getPlanByUserId(userId)
    return { [ProductType.money]: plan.expires?.getTime() }
  }

  static isJwtAdditionFull(addition?: BillingJWTAddition) {
    return addition && !!addition[ProductType.money]
  }

  private static isPlanTrial(plan: Plan) {
    return (
      // Charges from new to old
      _.head(_.reverse(_.sortBy(copy(plan.chargeEvents), ['created'])))
        ?.chargeType === ChargeTypes.trial
    )
  }

  static async notifyExpiringPlans() {
    const expiresStart = new Date(),
      expiresEnd = addDays(expiresStart, 1),
      plans = await PlanManager.findExpiringPlans(expiresStart, expiresEnd)

    const promises: Promise<any>[] = []
    for (const plan of plans) {
      if (!plan.user?.email) continue

      promises.push(
        MessageService.sendExpiringPlanEmail({
          email: plan.user.email,
          isTrial: this.isPlanTrial(plan),
        }),
      )
    }

    return Promise.all(promises)
  }
}

import { getFullPath } from '@/services/getPath'
import { emailQueue, telegramQueue } from '@/tasks/queue'

import { BaseEmail } from './types'

export class MessageService {
  private static async sendEmail(data: BaseEmail) {
    if (process.env.NODE_ENV == 'development')
      console.log(data.templateId, JSON.stringify(data.recepients, null, 2))
    else
      await emailQueue.add(data, { attempts: 3, timeout: 5000, backoff: 5000 })
  }

  private static async sendTelegramMessage(message: string) {
    if (process.env.NODE_ENV == 'development')
      console.log('[Telegram Message]', message)
    else
      await telegramQueue.add(message, {
        attempts: 3,
        timeout: 5000,
        backoff: 5000,
      })
  }

  private static getGotoUrl({
    token,
    purpose,
  }: {
    token: string
    purpose: string
  }) {
    return getFullPath({ path: `/goto/${token}/${purpose}`, includeHost: true })
  }

  public static async sendWaitlistValidationEmail({
    email,
    token,
  }: {
    email: string
    token: string
  }) {
    return this.sendEmail({
      templateId: 'waitlist-validate-email',
      recepients: [
        {
          address: { email },
          context: {
            url: this.getGotoUrl({ token, purpose: 'waitlist-verify-email' }),
          },
        },
      ],
    })
  }

  public static async sendValidationEmail({
    email,
    token,
  }: {
    email: string
    token: string
  }) {
    return this.sendEmail({
      templateId: 'validate-email',
      recepients: [
        {
          address: { email },
          context: {
            url: this.getGotoUrl({ token, purpose: 'verify-email' }),
          },
        },
      ],
    })
  }

  public static async sendPasswordResetEmail({
    email,
    token,
  }: {
    email: string
    token: string
  }) {
    return this.sendEmail({
      templateId: 'reset-password',
      recepients: [
        {
          address: { email },
          context: {
            url: this.getGotoUrl({ token, purpose: 'reset' }),
          },
        },
      ],
    })
  }

  public static async sendSuccessfulPurchaseEmail(email: string) {
    return this.sendEmail({
      templateId: 'successful-purchase',
      recepients: [{ address: { email } }],
    })
  }

  public static async sendExpiringPlanEmail({
    email,
    isTrial,
  }: {
    email: string
    isTrial: boolean
  }) {
    return this.sendEmail({
      templateId: 'expiring-plan',
      recepients: [
        {
          address: { email },
          context: {
            url: this.getGotoUrl({
              token: 'billing',
              purpose: 'user-settings',
            }),
            isTrial,
          },
        },
      ],
    })
  }

  public static purchaseHappened({
    userId,
    username,
    provider,
  }: {
    userId: string
    username: string
    provider: string
  }) {
    return this.sendTelegramMessage(
      `Юзер ${username} (#${userId}) совершил покупку — ${provider}`,
    )
  }

  public static dailySignupStats(signedUpUsernames: Array<string>) {
    return this.sendTelegramMessage(
      signedUpUsernames.length
        ? `В прошедшие 24 часа зарегистрировалось ${
            signedUpUsernames.length
          } юзеров:\n\n${signedUpUsernames.join('\n')}`
        : 'Регистраций в прошедшие 24 часа не было',
    )
  }
}

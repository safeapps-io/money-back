import Feedback from '@/models/feedback.model'
import { getFullPath } from '@/services/getPath'
import { emailQueue, telegramQueue } from '@/tasks/queue'
import { feedbackAdminPath, userAdminPath } from '@/admin/paths'

import { BaseEmail } from './types'

export class MessageService {
  private static async sendEmail(data: BaseEmail) {
    if (process.env.NODE_ENV == 'development')
      console.log(data.templateId, JSON.stringify(data.recepients, null, 2))
    else await emailQueue.add(data, { attempts: 3, timeout: 5000, backoff: 5000 })
  }

  private static async sendTelegramMessage(message: string) {
    if (process.env.NODE_ENV == 'development' || process.env.STAGE)
      console.log('[Telegram Message]', message)
    else
      await telegramQueue.add(
        { message },
        {
          attempts: 3,
          timeout: 5000,
          backoff: 5000,
        },
      )
  }

  private static getGotoUrl({ token, purpose }: { token: string; purpose: string }) {
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

  public static async sendValidationEmail({ email, token }: { email: string; token: string }) {
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

  public static async sendPasswordResetEmail({ email, token }: { email: string; token: string }) {
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
      `<a href="${userAdminPath(userId)}">${username}</a> совершил покупку — ${provider}`,
    )
  }

  public static dailySignupStats(signedUpUsernames: Array<[string, string]>) {
    const list = signedUpUsernames.map(
      ([id, username]) => `<a href="${userAdminPath(id)}">${username}</a>`,
    )

    return this.sendTelegramMessage(
      list.length
        ? `В прошедшие 24 часа зарегистрировалось ${list.length} юзеров:\n\n${list.join('\n')}`
        : 'Регистраций в прошедшие 24 часа не было',
    )
  }

  public static postFeedback(feedback: Feedback, username: string) {
    const { description } = feedback,
      realDescription = description.length > 500 ? description.slice(0, 500) + '[...]' : description
    return this.sendTelegramMessage(
      `<a href="${userAdminPath(feedback.userId)}">${username}</a>` +
        `оставил <a href="${feedbackAdminPath(feedback.id)}">фидбек</a>:` +
        `\n\n${realDescription}`,
    )
  }
}

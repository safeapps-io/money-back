import { getFullPath } from '@/services/getPath'

import { BaseEmail } from './types'
import { emailQueue } from './queues'

export class MessageService {
  private static async sendEmail(data: BaseEmail) {
    if (process.env.NODE_ENV == 'development')
      console.log(data.templateId, JSON.stringify(data.recepients, null, 2))
    else
      await emailQueue.add(data, { attempts: 3, timeout: 5000, backoff: 5000 })
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
}
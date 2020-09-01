import { BaseEmail } from './types'
import { emailQueue } from './queues'

export class MessageService {
  private static async sendEmail(data: BaseEmail) {
    if (process.env.NODE_ENV == 'development')
      console.log(data.templateId, data)
    else
      await emailQueue.add(data, { attempts: 3, timeout: 5000, backoff: 5000 })
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
      recepients: [{ address: { email }, context: { token } }],
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
      recepients: [{ address: { email }, context: { token } }],
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
      recepients: [{ address: { email }, context: { token } }],
    })
  }
}

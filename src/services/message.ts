export class MessageService {
  public static async sendValidationEmail(data: {
    email: string
    token: string
  }): Promise<void> {
    console.log('validating email', data)
    return
  }

  public static async sendPasswordResetEmail(data: {
    email: string
    token: string
  }): Promise<void> {
    console.log('resetting password', data)
    return
  }
}

export interface BaseEmail {
  templateId: string

  recepients: {
    address: {
      email: string
      username?: string
    }
    context: {
      [key: string]: any
    }
  }[]
}

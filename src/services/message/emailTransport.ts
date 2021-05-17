import SparkPost from 'sparkpost'

import { BaseEmail } from './types'

const client = new SparkPost(process.env.SPARKPOST_KEY, {
  origin: 'https://api.eu.sparkpost.com:443',
})

export const createTransmission = (email: BaseEmail) => {
  const transmission = {
    options: {
      open_tracking: false,
      click_tracking: false,
      transactional: true,
    },
    recipients: email.recepients.map((data) => ({
      address: data.address,
      substitution_data: data.context,
    })),
    content: {
      template_id: email.templateId,
    },
  }

  return client.transmissions.send(transmission)
}

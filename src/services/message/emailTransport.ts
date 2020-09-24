import SparkPost from 'sparkpost'

import { emailQueue } from './queues'

const client = new SparkPost(process.env.SPARKPOST_KEY, {
  origin: 'https://api.eu.sparkpost.com:443',
})

export const setupEmailTransportWorker = () =>
  // Setting high concurrency, because that is mostly a network-heavy task,
  // no real CPU intensity here.
  emailQueue.process(1000, async (job) => {
    const transmission = {
      options: {
        open_tracking: false,
        click_tracking: false,
        transactional: true,
      },
      recipients: job.data.recepients.map((data) => ({
        address: data.address,
        substitution_data: data.context,
      })),
      content: {
        template_id: job.data.templateId,
      },
    }

    return client.transmissions.send(transmission)
  })

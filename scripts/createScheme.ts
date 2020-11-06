import { nanoid } from 'nanoid'
import { base } from './base'

import { input } from '@/utils/readline'

import { SchemeManager } from '@/models/scheme.model'

const main = async () => {
  await base()

  const scheme = {
    id: nanoid(),
    title: await input('Title? '),
    ...JSON.parse(await input('Input JSON schema of a schema ')),
  }

  SchemeManager.create(scheme)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit()
    })
}

main()
  .then(() => {})
  .catch(console.error)

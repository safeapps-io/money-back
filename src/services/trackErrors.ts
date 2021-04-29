import * as Sentry from '@sentry/node'
import pkg from '../../package.json'

const shouldTrack = process.env.NODE_ENV == 'production'

export const trackErrorsInit = () =>
  shouldTrack &&
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    release: pkg.version,
  })

export const trackError = (e: Error) =>
  shouldTrack && Sentry.captureException(e)

import { differenceInMilliseconds, format } from 'date-fns'
import ms from 'ms'

export const dateFormat = (date: Date | null, formatString = 'dd.MM.yyyy') => {
  if (!date) return '—'

  return (
    format(date, formatString) +
    ` (${ms(-differenceInMilliseconds(new Date(), date))})`
  )
}

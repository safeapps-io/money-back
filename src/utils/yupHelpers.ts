import * as yup from 'yup'

export const optionalArrayOfStringsOrString = yup
  .array()
  .transform((_, val) => {
    if (typeof val === 'string') return [val]
    return val
  })
  .notRequired()
  .of(
    yup
      .string()
      .trim()
      .ensure(),
  )
  .compact()

export const dateAsTimestamp = yup.date().transform((_, val) => new Date(val))

export const optionalString = yup
  .string()
  .nullable()
  .notRequired()

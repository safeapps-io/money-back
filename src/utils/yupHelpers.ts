import * as yup from 'yup'
import { FormValidationError } from '@/services/errors'

export const optionalArrayOfStringsOrString = yup
  .array()
  .transform((_, val) => {
    if (typeof val === 'string') return [val]
    return val
  })
  .notRequired()
  .of(yup.string().trim().ensure())
  .compact()

export const dateAsTimestamp = yup.date().transform((_, val) => new Date(val))

export const optionalString = yup.string().nullable().notRequired()

export const requiredString = yup.string().required()

export const transformValidationErrorToObject = (err: yup.ValidationError) =>
  err.inner.reduce((acc, curr) => {
    acc[curr.path] = curr.errors
    return acc
  }, {} as { [key: string]: string[] })

export function runSchemaWithFormError<T>(schema: yup.Schema<any>, data: T): T {
  try {
    return schema.validateSync(data, { abortEarly: false, stripUnknown: true })
  } catch (err) {
    throw new FormValidationError(
      'error',
      transformValidationErrorToObject(err as yup.ValidationError),
    )
  }
}

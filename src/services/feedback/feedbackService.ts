import * as yup from 'yup'

import { optionalString, requiredString, runSchemaWithFormError } from '@/utils/yupHelpers'
import { FeedbackManager } from '@/models/feedback.model'
import { MessageService } from '../message/messageService'

const feedbackScheme = yup
  .object({
    userId: requiredString,
    email: optionalString,
    description: requiredString.max(10000),
  })
  .noUnknown()
export const createFeedback = async (
  feedback: {
    userId: string
    email?: string
    description: string
  },
  username: string,
) => {
  runSchemaWithFormError(feedbackScheme, feedback)

  const model = await FeedbackManager.create(feedback)
  await MessageService.postFeedback(model, username)
}

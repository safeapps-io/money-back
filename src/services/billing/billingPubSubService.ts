import ChargeEvent from '@/models/billing/chargeEvent.model'
import {
  UserPubSubMessageTypes,
  UserPubSubService,
} from '@/services/user/userPubSubService'

export class BillingPubSubService {
  static publishChargedata({
    chargeEvent,
    relatedUserIds,
  }: {
    chargeEvent: ChargeEvent
    relatedUserIds: string[]
  }) {
    return Promise.all(
      relatedUserIds.map((id) =>
        UserPubSubService.publishForUser({
          userId: id,
          type: UserPubSubMessageTypes.chargeEvent,
          data: chargeEvent,
        }),
      ),
    )
  }
}

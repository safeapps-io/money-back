import BaseModel from '@/models/base'

export enum Serializers {
  userFull = 'userFull',
  userFullNoAssociations = 'userFullNoAssociations',
  session = 'session',
  walletAccess = 'walletAccess',
  walletUser = 'walletUser',
  wallet = 'wallet',
  entity = 'entity',
  product = 'product',
  chargeEvent = 'chargeEvent',
  planFull = 'planFull',
  planPartial = 'planPartial',
  scheme = 'scheme',
  metaCategory = 'metaCategory',
}

const baseModelFields = ['id', 'created', 'updated'],
  userCommonFields = [...baseModelFields, 'username'],
  userFullAttrs = [
    ...userCommonFields,
    'email',
    'isAdmin',
    'isSubscribed',
    'b64InvitePublicKey',
    'b64EncryptedInvitePrivateKey',
    'b64salt',
    'encr',
    'isAdmin',
  ]

const serializerNameToConfig: {
  [serializerName in Serializers]: {
    attrs: string[]
    associations?: [string, Serializers][]
  }
} = {
  userFull: {
    attrs: userFullAttrs,
    associations: [['plans', Serializers.planPartial]],
  },
  userFullNoAssociations: {
    attrs: userFullAttrs,
  },
  session: {
    attrs: [...baseModelFields, 'description', 'current'],
  },
  walletAccess: {
    attrs: [...baseModelFields, 'chest', 'inviteId', 'accessLevel'],
  },
  walletUser: {
    attrs: userCommonFields,
    associations: [
      ['WalletAccess', Serializers.walletAccess],
      ['plans', Serializers.planPartial],
    ],
  },
  wallet: {
    attrs: [...baseModelFields],
    associations: [['users', Serializers.walletUser]],
  },
  entity: { attrs: [...baseModelFields, 'encr', 'walletId'] },
  product: {
    attrs: ['id', 'slug', 'price', 'duration', 'trialDuration'],
  },
  chargeEvent: {
    attrs: [
      ...baseModelFields,
      'eventType',
      'chargeType',
      'provider',
      'expiredOld',
      'expiredNew',
    ],
  },
  planFull: {
    attrs: [...baseModelFields, 'expires'],
    associations: [
      ['product', Serializers.product],
      ['chargeEvents', Serializers.chargeEvent],
    ],
  },
  planPartial: {
    attrs: [...baseModelFields, 'expires'],
  },
  scheme: {
    attrs: [
      ...baseModelFields,
      'title',
      'encoding',
      'header',
      'decimalDelimiterChar',
      'transformDateFormat',
      'fieldnameMap',
      'delimiter',
      'newline',
      'quoteChar',
      'escapeChar',
    ],
  },
  metaCategory: {
    attrs: [...baseModelFields, 'isIncome', 'name', 'color', 'assignedMcc'],
  },
}

export const serializeModel = <T>(
  model: BaseModel<T> | Array<BaseModel<T>>,
  serializerName: keyof typeof serializerNameToConfig,
) => {
  const serializer = serializerNameToConfig[serializerName],
    getResult = (model: BaseModel<T>) => {
      const result: any = {}
      for (const fieldname of serializer.attrs) {
        const value = (model as any)[fieldname]
        let finalValue: any
        switch (true) {
          case value instanceof Date:
            finalValue = value.getTime()
            break

          default:
            finalValue = value
        }
        result[fieldname] = finalValue
      }

      for (const [fieldname, serializerName] of serializer.associations || []) {
        let fieldValue = (model as any)[fieldname]

        if (!fieldValue) {
          console.warn('Unfetched dependency: ', {
            instance: model.constructor.name,
            fieldname,
            serializerName,
            stack: new Error().stack,
          })
          continue
        }

        result[fieldname] = serializeModel(fieldValue, serializerName)
      }

      return result
    }

  return Array.isArray(model)
    ? model.map((innerMode) => getResult(innerMode))
    : getResult(model)
}

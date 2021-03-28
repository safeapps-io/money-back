import * as yup from 'yup'
import { decode } from 'base64-arraybuffer'

import {
  runSchemaWithFormError,
  requiredString,
  optionalString,
} from '@/utils/yupHelpers'
import { FormValidationError } from '@/services/errors'
import { InviteServiceFormErrors, InviteStringTypes } from './inviteTypes'
import User, { UserManager } from '@/models/user.model'
import { CryptoService } from '@/services/crypto/cryptoService'

/**
 * We now have a few distinct invite types:
 *
 * 1. service invite. Is generated by a signed up user with their keys, is a multi-time
 *    use thing and should not be limited in quantity.
 *
 * 2. wallet invite. All the same as service invite, but also launches the wallet join
 *    process. One-time use only (has `inviteId`).
 *
 * This service just parses, validates and provides a single point of entry for all
 * types of invites with a simple outgoing interface.
 */
export class InviteStringService {
  public static async parseAndVerifySignature(
    inviteString: string,
  ): Promise<InvitePayload> {
    try {
      runSchemaWithFormError(requiredString, inviteString)
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }

    // Then we try to work it out as a production invite.
    let parsed: Await<ReturnType<
        typeof InviteStringService.parseAsymmetricInvite
      >>,
      userInviter: User
    try {
      parsed = await this.parseAsymmetricInvite(inviteString)
      userInviter = await this.verifySignature(parsed)
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }

    return 'walletId' in parsed.decodedInvite
      ? {
          type: InviteStringTypes.wallet,
          payload: parsed.decodedInvite,
          userInviter,
        }
      : {
          type: InviteStringTypes.service,
          payload: parsed.decodedInvite,
          userInviter,
        }
  }

  private static inviteDelimiter = '___'

  private static inviteSchema = yup
    .object({
      userInviterId: requiredString,
      inviteId: requiredString,
      walletId: optionalString,
    })
    .noUnknown()
  private static async parseAsymmetricInvite(inviteString: string) {
    const [dataBuffer, signatureBuffer] = inviteString
      .split(this.inviteDelimiter)
      .map(decode)

    const decodedInvite = JSON.parse(
      Buffer.from(dataBuffer).toString('utf-8'),
    ) as ServiceInvitePayload | WalletInviteObject

    runSchemaWithFormError(this.inviteSchema, decodedInvite)

    return {
      decodedInvite,
      dataBuffer,
      signatureBuffer,
    }
  }

  private static async verifySignature({
    decodedInvite,
    dataBuffer,
    signatureBuffer,
  }: Await<ReturnType<typeof InviteStringService.parseAsymmetricInvite>>) {
    const inviterUser = await UserManager.byId(decodedInvite.userInviterId)

    if (
      !inviterUser?.b64InvitePublicKey ||
      !CryptoService.verify({
        b64PublicKey: inviterUser.b64InvitePublicKey as string,
        dataBuffer,
        signatureBuffer,
      })
    )
      throw new Error()

    return inviterUser
  }

  public static verifyJoiningUserInviteSignature({
    inviteString,
    joiningUserSignature,
    joiningUserInvitePublicKey,
  }: {
    inviteString: string
    joiningUserSignature: string
    joiningUserInvitePublicKey: string
  }) {
    const signatureBuffer = decode(
      joiningUserSignature.split(this.inviteDelimiter)[1],
    )

    return CryptoService.verify({
      b64PublicKey: joiningUserInvitePublicKey,
      dataBuffer: Buffer.from(inviteString),
      signatureBuffer,
    })
  }
}

type ServiceInvitePayload = { userInviterId: string }
type WalletInviteObject = ServiceInvitePayload & {
  inviteId: string
  walletId: string
}
export type InvitePayload =
  | {
      type: InviteStringTypes.service
      userInviter: User
      payload: ServiceInvitePayload
    }
  | {
      type: InviteStringTypes.wallet
      userInviter: User
      payload: WalletInviteObject
    }

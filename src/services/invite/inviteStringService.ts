import * as yup from 'yup'
import { decode } from 'base64-arraybuffer'
import { Await } from '@/@types/helpers'

import { encryptAes, decryptAes } from '@/utils/crypto'
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
 * 1. prelaunch. It is generated on the backend, because user has not yet generated
 *    master-password and therefore has no public/private keys. This invite is not
 *    limited in spread, so `inviteId` is not present in the payload. It will only
 *    work for prelaunch sign up process and will turn into ashes afterwards.
 *
 * 2. launch invite. It is generated on the backend. We need to let the waitlisted user
 *    join the service after launch. The invite would have email and user id encrypted
 *    into it.
 *
 * 3. service invite. Is generated by a signed up user with their keys, is a one-time
 *    use thing (has `inviteId`) and should be limited in quantity.
 *
 * 4. wallet invite. All the same as service invite, but also launches the wallet join
 *    process.
 *
 * This service just parses, validates and provides a single point of entry for all
 * types of invites with a simple outgoing interface.
 */
export class InviteStringService {
  private static launchInviteScheme = yup.object({
    email: requiredString,
    userId: requiredString,
  })
  public static async parseAndVerifySignature(
    inviteString: string,
  ): Promise<InvitePayload> {
    try {
      runSchemaWithFormError(requiredString, inviteString)
    } catch (error) {
      throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
    }

    if (this.isAesInvite(inviteString)) {
      try {
        const decrypted = decryptAes<
          PrelaunchInvitePayload | LaunchInvitePayload
        >(inviteString)

        if ('email' in decrypted) {
          runSchemaWithFormError(this.launchInviteScheme, decrypted)
          return { type: InviteStringTypes.launch, payload: decrypted }
        } else {
          runSchemaWithFormError(requiredString, decrypted.userInviterId)
          return { type: InviteStringTypes.prelaunch, payload: decrypted }
        }
      } catch (e) {
        throw new FormValidationError(InviteServiceFormErrors.invalidInvite)
      }
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

  public static generatePrelaunchInvite(userInviterId: string): string {
    const payload: PrelaunchInvitePayload = { userInviterId }
    return encryptAes(payload)
  }

  public static generateLaunchInvite(data: LaunchInvitePayload) {
    return encryptAes(data)
  }

  private static inviteDelimiter = '___'
  private static isAesInvite(inviteString: string) {
    return inviteString.includes(this.inviteDelimiter) ? false : true
  }

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
      !(await CryptoService.verify({
        b64PublicKey: inviterUser.b64InvitePublicKey as string,
        dataBuffer,
        signatureBuffer,
      }))
    )
      throw new Error()

    return inviterUser
  }
}

type PrelaunchInvitePayload = { userInviterId: string }
type LaunchInvitePayload = { userId: string; email: string }
type ServiceInvitePayload = PrelaunchInvitePayload & { inviteId: string }
type WalletInviteObject = ServiceInvitePayload & {
  walletId: string
}
type InvitePayload =
  | {
      type: InviteStringTypes.prelaunch
      payload: PrelaunchInvitePayload
    }
  | {
      type: InviteStringTypes.launch
      payload: LaunchInvitePayload
    }
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

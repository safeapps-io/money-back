import * as yup from 'yup'

import { AccessError, RequestError } from '@/services/errors'
import Wallet, { WalletManager } from '@/models/wallet.model'
import { runSchemaWithFormError, requiredString } from '@/utils/yupHelpers'
import { AccessLevels } from '@/models/walletAccess.model'
import { WalletPubSubService } from './walletPubSubService'

export class WalletService {
  static async getWalletByUserAndId({
    userId,
    walletId,
  }: {
    userId: string
    walletId: string
  }) {
    const res = await WalletManager.byIdAndUserId({ userId, walletId })
    if (!res) throw new AccessError()
    return res
  }

  static async getUserWallets(userId: string) {
    return WalletManager.byUserId(userId)
  }

  static async getUserWalletIds(userId: string) {
    return (await WalletManager.byUserId(userId)).map((ent) => ent.id)
  }

  static async getWalletUserIds(walletId: string) {
    return (await WalletManager.byId(walletId))?.users.map((user) => user.id)
  }

  private static createScheme = yup
    .object({
      userId: requiredString,
      chest: requiredString,
    })
    .noUnknown()
  static async create(userId: string, chest: string) {
    runSchemaWithFormError(this.createScheme, { userId, chest })
    return WalletManager.create({ userId, chest })
  }

  private static isUserOwner({
    wallet,
    userId,
  }: {
    wallet: Wallet
    userId: string
  }) {
    return wallet.users.some(
      (user) =>
        user.id === userId &&
        user.WalletAccess.accessLevel === AccessLevels.owner,
    )
  }

  private static destroyScheme = yup
    .object({
      userId: requiredString,
      walletId: requiredString,
    })
    .noUnknown()
  static async destroy(userId: string, walletId: string) {
    runSchemaWithFormError(this.destroyScheme, { userId, walletId })

    const wallet = await WalletManager.byId(walletId)
    if (!wallet) throw new RequestError('No such wallet')

    const isOwner = this.isUserOwner({ wallet, userId })
    if (!isOwner) throw new RequestError('You are not an owner')

    const connectedUserIds = await this.getWalletUserIds(wallet.id)
    await WalletManager.destroy(walletId)
    return WalletPubSubService.publishWalletDestroy({
      walletId: wallet.id,
      connectedUserIds: connectedUserIds!,
    })
  }

  private static removeUserScheme = yup
    .object({
      initiatorId: requiredString,
      walletId: requiredString,
      userToRemoveId: requiredString,
    })
    .noUnknown()
  static async removeUser({
    initiatorId,
    walletId,
    userToRemoveId,
  }: {
    initiatorId: string
    walletId: string
    userToRemoveId: string
  }) {
    runSchemaWithFormError(this.removeUserScheme, {
      initiatorId,
      walletId,
      userToRemoveId,
    })
    const wallet = await this.getWalletByUserAndId({
        userId: initiatorId,
        walletId,
      }),
      isOwner = this.isUserOwner({ wallet, userId: initiatorId }),
      isRemovingSelf = initiatorId === userToRemoveId,
      // Owner can remove anyone except self; other person can only remove self
      allowOperation =
        (isOwner && !isRemovingSelf) || (!isOwner && isRemovingSelf)

    if (!allowOperation) throw new RequestError('Operation not allowed')
    await WalletManager.removeUser({
      walletId: wallet.id,
      userId: userToRemoveId,
    })

    const updatedWallet = await WalletManager.byId(wallet.id)
    await WalletPubSubService.publishWalletUpdates({
      wallet: updatedWallet!,
    })

    return updatedWallet
  }

  private static updateChestsScheme = yup.array(
    yup
      .object({
        walletId: requiredString,
        chest: requiredString,
      })
      .noUnknown(),
  )
  static async updateChests({
    userId,
    chests,
  }: {
    userId: string
    chests: { walletId: string; chest: string }[]
  }) {
    runSchemaWithFormError(this.updateChestsScheme, chests)

    const userWallets = await this.getUserWallets(userId),
      userWalletIds = userWallets.map((wall) => wall.id),
      allChestsRepresented =
        // In case user doesn't update all the chests at once for some reason
        chests.length === userWalletIds.length &&
        // Authorization
        chests
          .map((chest) => userWalletIds.includes(chest.walletId))
          .every(Boolean)

    if (!allChestsRepresented)
      throw new RequestError('Not all chests are represented')

    const walletAccessIdsAndChests = userWallets.map((wall) => {
      const userWa = wall.users.find((u) => u.id === userId)

      return {
        id: userWa!.WalletAccess.id,
        chest: chests.find((chest) => chest.walletId === wall.id)!.chest,
      }
    })
    await WalletManager.updateChests(walletAccessIdsAndChests)

    const refetchedWallets = await WalletManager.byIds(userWalletIds)
    return Promise.all(
      refetchedWallets.map((wallet) =>
        WalletPubSubService.publishWalletUpdates({ wallet }),
      ),
    )
  }
}

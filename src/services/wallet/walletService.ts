import * as yup from 'yup'

import { AccessError } from '@/services/errors'
import Wallet, { WalletManager } from '@/models/wallet.model'
import { runSchemaWithFormError, requiredString } from '@/utils/yupHelpers'
import { WalletAccessManager, AccessLevels } from '@/models/walletAccess.model'
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
    return (await WalletManager.byUserId(userId)).map(ent => ent.id)
  }

  static async getWalletUserIds(walletId: string) {
    return (await WalletManager.byId(walletId))?.users.map(user => user.id)
  }

  private static createScheme = yup
    .object({
      userId: requiredString,
      chest: requiredString,
    })
    .noUnknown()
  static async create(userId: string, chest: string) {
    runSchemaWithFormError(this.createScheme, { userId, chest })
    const { id: walletId } = await WalletManager.create()
    await WalletAccessManager.createOwner({ chest, userId, walletId })
    return WalletManager.byId(walletId)
  }

  private static isUserOwner({
    wallet,
    userId,
  }: {
    wallet: Wallet
    userId: string
  }) {
    return wallet.users.some(
      user =>
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
    if (!wallet) throw new AccessError()

    const isOwner = this.isUserOwner({ wallet, userId })
    if (!isOwner) throw new AccessError()

    const connectedUserIds = await this.getWalletUserIds(wallet.id)
    await WalletManager.destroy(walletId)
    return WalletPubSubService.publishWalletDestroy({
      walletId: wallet.id,
      connectedUserIds: connectedUserIds!,
    })
  }

  private static addUserScheme = yup
    .object({
      initiatorId: requiredString,
      walletId: requiredString,
      userToAddId: requiredString,
      inviteId: requiredString,
    })
    .noUnknown()
  static async addUser({
    initiatorId,
    walletId,
    userToAddId,
    inviteId,
  }: {
    initiatorId: string
    walletId: string
    userToAddId: string
    inviteId: string
  }) {
    runSchemaWithFormError(this.addUserScheme, {
      initiatorId,
      walletId,
      userToAddId,
      inviteId,
    })

    const wallet = await this.getWalletByUserAndId({
        userId: initiatorId,
        walletId: walletId,
      }),
      isOwner = this.isUserOwner({ wallet, userId: initiatorId })
    if (!isOwner) throw new AccessError()

    try {
      await this.getWalletByUserAndId({
        walletId,
        userId: userToAddId,
      })
      // User is already a member. No need to do anything
      return
    } catch (error) {
      // User is not a member, need to do everything by the instruction
    }

    await WalletAccessManager.addUser({
      walletId,
      inviteId,
      userId: userToAddId,
    })

    const fetchedWallet = await WalletManager.byId(wallet.id)

    return WalletPubSubService.publishWalletUpdates({ wallet: fetchedWallet! })
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

    if (!allowOperation) throw new AccessError()
    await WalletAccessManager.removeUser({
      walletId: wallet.id,
      userId: userToRemoveId,
    })

    const updatedWallet = await WalletManager.byId(wallet.id)
    await WalletPubSubService.publishWalletUpdates({
      wallet: updatedWallet!,
    })

    return updatedWallet
  }

  private static updateChestScheme = yup
    .object({
      userId: requiredString,
      walletId: requiredString,
      chest: requiredString,
    })
    .noUnknown()
  static async updateChest(data: {
    userId: string
    walletId: string
    chest: string
  }) {
    runSchemaWithFormError(this.updateChestScheme, data)
    const { userId, walletId } = data

    await this.getWalletByUserAndId({ userId, walletId })
    await WalletAccessManager.updateChest(data)

    const wallet = await this.getWalletByUserAndId({ userId, walletId })

    return WalletPubSubService.publishWalletUpdates({ wallet })
  }
}

export enum InviteServiceFormErrors {
  unknownError = 'unknownError',
  invalidInvite = 'invalidInvite',
  alreadyMember = 'alreadyMember',
  inviteAlreadyUsed = 'inviteAlreadyUsed',
  ownerOffline = 'ownerOffline',
  joiningUserOffline = 'joiningUserOffline',
  ownerHasNoPlan = 'ownerHasNoPlan',
}

export enum InviteStringTypes {
  service = 'service',
  wallet = 'wallet',
}

export enum InvitePurpose {
  signup = 'signup',
  walletJoin = 'walletJoin',
}

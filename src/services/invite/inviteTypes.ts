export enum InviteServiceFormErrors {
  unknownError = 'unknownError',
  limitReached = 'limitReached',
  cannotUsePrelaunchInvites = 'cannotUsePrelaunchInvites',
  invalidInvite = 'invalidInvite',
  alreadyMember = 'alreadyMember',
  inviteAlreadyUsed = 'inviteAlreadyUsed',
  ownerOffline = 'ownerOffline',
  joiningUserOffline = 'joiningUserOffline',
}

export enum InviteStringTypes {
  prelaunch = 'prelaunch',
  launch = 'launch',
  service = 'service',
  wallet = 'wallet',
}

export enum InvitePurpose {
  waitlist = 'waitlist',
  signup = 'signup',
  walletJoin = 'walletJoin',
}

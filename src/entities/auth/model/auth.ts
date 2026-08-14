export type SignedIn = {
  readonly state: 'signed-in'
  readonly email: string
  readonly orgName: string | null
}

export type SignedOut = {
  readonly state: 'signed-out'
}

export type CliMissing = {
  readonly state: 'cli-missing'
}

export type AuthStatus = SignedIn | SignedOut | CliMissing

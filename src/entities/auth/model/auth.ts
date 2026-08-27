type SignedIn = {
  readonly state: 'signed-in'
  readonly email: string
  readonly orgName: string | null
}

type SignedOut = {
  readonly state: 'signed-out'
}

type CliMissing = {
  readonly state: 'cli-missing'
}

export type AuthStatus = SignedIn | SignedOut | CliMissing

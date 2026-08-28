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

// The CLI is there but did not answer: it hung, exited badly, or printed
// something other than its JSON. Nobody is signed out on that evidence.
type Unreachable = {
  readonly state: 'unreachable'
  readonly said: string
}

export type AuthStatus = SignedIn | SignedOut | CliMissing | Unreachable

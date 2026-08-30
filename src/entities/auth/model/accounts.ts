import type { AuthStatus } from './auth'

export type AccountRow = {
  readonly id: string
  // Empty for a login filed before .claude.json caught up with its name. The
  // row is real — the credentials are — and the name arrives on a later read.
  readonly email: string
  readonly orgName: string | null
  readonly seenAt: number
}

export type AccountIdentity = {
  readonly email: string
  readonly orgName: string | null
}

// Whose sign-in this computer is holding, worked out by matching the
// credentials themselves against what Zetrem has kept. The name in
// .claude.json, and `claude auth status` which echoes it, lag a login by
// seconds or minutes, so they answer only where no kept slot matched.
export type AccountHere =
  | { readonly kind: 'row'; readonly id: string }
  | ({ readonly kind: 'named' } & AccountIdentity)
  | { readonly kind: 'unnamed' }
  | { readonly kind: 'signed-out' }

export type AccountList = {
  readonly auth: AuthStatus
  readonly here: AccountHere
  readonly accounts: readonly AccountRow[]
}

// What an account operation could not do, named rather than said: `said`
// carries the name across the bridge and the pane is where it becomes words.
// A CLI's own last line still travels as itself.
export type AccountTroubleCode = 'switch-not-confirmed' | 'credentials-unreadable'

export type AccountBusy = 'add' | 'switch' | 'reauth' | 'remove' | 'signout' | null

// Which row an operation is running on; null inside is the machine-wide sign
// out, which belongs to no row. The wrapper tells "nothing is running" apart
// from it.
export type AccountBusyOn = { readonly id: string | null } | null

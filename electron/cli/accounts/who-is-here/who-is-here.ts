import type { AccountIdentity, AccountTroubleCode } from '@/entities/auth'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import type { AccountsIndex } from '../../../store/accounts-store/accounts-store.types'
import type { CredentialSnapshot } from '../../credentials/credentials.types'
import type { Here, HereDeps, Presence } from './who-is-here.types'

// A person's address is the same login however the CLI happens to have cased
// it, and a row filed before its name arrived matches nobody.
export function sameEmail(one: string | null, two: string | null): boolean {
  if (one === null || two === null || one.length === 0 || two.length === 0) return false
  return one.toLowerCase() === two.toLowerCase()
}

// The label .claude.json carries. Unlike rowOf it does not insist on an
// accountUuid: the file writes the name first and is worth reading before it
// is complete.
export function namedBy(snapshot: CredentialSnapshot): AccountIdentity | null {
  const account = snapshot.oauthAccount
  if (account === null || typeof account !== 'object') return null
  const { emailAddress, organizationName } = account as Record<string, unknown>
  if (typeof emailAddress !== 'string' || emailAddress.length === 0) return null
  return {
    email: emailAddress,
    orgName: typeof organizationName === 'string' ? organizationName : null,
  }
}

// The pane can do nothing with what `security` said, and a stale
// .credentials.json is not an answer: an operation that cannot read what this
// computer holds refuses instead of acting on the wrong account.
export async function heldHere(deps: HereDeps): Promise<Outcome<CredentialSnapshot>> {
  const read = await deps.read()
  if (read.ok) return read
  console.error('[accounts] could not read the sign-in on this computer', read.why.said)
  const unreadable: AccountTroubleCode = 'credentials-unreadable'
  return lost(read.why.code, unreadable)
}

// Whether this is a name Zetrem is already keeping an account under.
function alreadyKept(index: AccountsIndex, email: string): boolean {
  return index.accounts.some((one) => sameEmail(one.email, email))
}

export async function presenceOf(
  deps: HereDeps,
  index: AccountsIndex,
  held: CredentialSnapshot,
): Promise<Presence> {
  if (held.credentials === null) return { kind: 'signed-out' }
  for (const row of index.accounts) {
    const slot = await deps.store.readSlot(row.id)
    if (slot !== null && slot.credentials === held.credentials) return { kind: 'row', id: row.id }
  }
  // Nothing byte-matches, so only the label is left — and a label naming an
  // account Zetrem keeps is the one thing it must not be believed about. "A
  // live claude renewed that account's token" and "a login outside Zetrem
  // replaced it and the label has not moved yet" leave the same bytes under
  // the same name, and the credentials carry nothing to tell them apart: no
  // address, a plan every account on that plan shares, and an access token
  // that is not a JWT. Believing the label there is what files one account's
  // login into another's slot, so this stays a login Zetrem cannot name. A
  // label naming a stranger has nothing to destroy and is taken at its word.
  const named = namedBy(held)
  if (named === null || alreadyKept(index, named.email)) return { kind: 'unnamed' }
  return { kind: 'named', ...named }
}

export async function whoIsHere(deps: HereDeps, index: AccountsIndex): Promise<Outcome<Here>> {
  const read = await heldHere(deps)
  if (!read.ok) return read
  return won({ who: await presenceOf(deps, index, read.value), held: read.value })
}

// The one identity a reading taken on this computer belongs to. Nobody is a
// real answer: a login Zetrem cannot name must not have another account's
// name asserted for it. `named` is the label's word, not a byte match, and a
// live claude rewrites that label from its own memory — so the numbers this
// reading carries stay unattributed rather than stamped with a name they
// cannot be proven to belong to.
export async function accountHere(deps: HereDeps): Promise<string | null> {
  const index = await deps.store.load()
  const here = await whoIsHere(deps, index)
  if (!here.ok) return null
  const { who } = here.value
  if (who.kind === 'row') {
    const row = index.accounts.find((one) => one.id === who.id)
    return row === undefined || row.email.length === 0 ? null : row.email
  }
  return null
}

import type { AccountIdentity } from '@/entities/auth'
import type { CredentialSnapshot } from '../../credentials/credentials.types'
import type { AccountsDeps } from '../accounts.types'

// Whose sign-in this computer is holding. The credentials themselves answer:
// they are written the moment a login lands, while the name beside them in
// .claude.json — and so `claude auth status`, which only echoes that file —
// lags by seconds or minutes. So a slot whose bytes match is the account, and
// the label is asked only when no slot matches at all.
export type Presence =
  // The bytes are the ones filed under this row.
  | { kind: 'row'; id: string }
  // Nothing byte-matches and the label names a stranger: a login made outside
  // Zetrem, late enough that the file has caught up with it.
  | ({ kind: 'named' } & AccountIdentity)
  // Nothing byte-matches, and the label either names nobody or names an
  // account Zetrem keeps — which proves nothing, since a renewal of that
  // account and a login that replaced it before the label moved are the same
  // bytes under the same name.
  | { kind: 'unnamed' }
  | { kind: 'signed-out' }

export type Here = {
  who: Presence
  held: CredentialSnapshot
}

// Reading who is here touches the store and the machine, and nothing else.
export type HereDeps = Pick<AccountsDeps, 'store' | 'read'>

import type { AuthStatus } from '@/entities/auth'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import type { AccountsStore } from '../../store/accounts-store/accounts-store.types'
import type { CredentialSnapshot } from '../credentials/credentials.types'

export type AccountsDeps = {
  store: AccountsStore
  // What this computer holds, or why it could not be read. A keychain that
  // would not answer is not a machine with nothing on it.
  read(): Promise<Outcome<CredentialSnapshot>>
  write(snapshot: CredentialSnapshot): Promise<void>
  // The account the login page should open on, or nobody when there is no
  // saying yet which account this login will turn out to be.
  login(email: string | null): Promise<void>
  // Every claude this app spawned, told to stop and seen to go. Asked only by
  // an operation that is about to write credentials, and only once.
  stop(): Promise<boolean>
  status(): Promise<AuthStatus>
  // A sleep of its own, so the wait for the CLI to finish writing can be
  // driven by a test instead of really taking the time it asks for.
  wait(ms: number): Promise<void>
  now(): number
  newId(): string
}

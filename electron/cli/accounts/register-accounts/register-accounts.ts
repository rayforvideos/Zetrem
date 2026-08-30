import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'
import type { WebContents } from 'electron'
import type { AccountList } from '@/entities/auth'
import { lost } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { handle } from '../../../ipc/ipc'
import { isPackagedRun } from '../../../shell/packaged/packaged'
import { openAccountsStore } from '../../../store/accounts-store/accounts-store'
import { readAuthStatus, runLogin } from '../../auth/auth'
import { readSnapshot, realIo, writeSnapshot } from '../../credentials/credentials'
import { accountWork } from '../account-guard/account-guard'
import type { StopChildren } from '../account-guard/account-guard.types'
import { addAccount, listAccounts, reauthAccount, removeAccount, switchAccount } from '../accounts'
import type { AccountsDeps } from '../accounts.types'
import { accountHere } from '../who-is-here/who-is-here'
import type { HereDeps } from '../who-is-here/who-is-here.types'
import { waitMs } from '../wait/wait'

// A dev run encrypts with the mock keychain key, which a packaged run's real
// key can never decrypt (and vice versa), so the two builds must never share
// a slot directory even though they share userData. That mock key is a
// well-known constant, so accounts-dev holds real tokens guarded by the 0600
// file mode alone.
export function accountsDir(): string {
  return join(app.getPath('userData'), isPackagedRun() ? 'accounts' : 'accounts-dev')
}

// The store and the machine, which is all it takes to say whose sign-in this
// computer is holding.
function hereDeps(): HereDeps {
  const io = realIo()
  return {
    store: openAccountsStore(accountsDir(), {
      encrypt: (text) => safeStorage.encryptString(text),
      decrypt: (data) => safeStorage.decryptString(data),
    }),
    read: () => readSnapshot(io),
  }
}

function depsFor(sender: WebContents, stop: StopChildren): AccountsDeps {
  const io = realIo()
  return {
    ...hereDeps(),
    stop,
    write: (snapshot) => writeSnapshot(io, snapshot),
    login: (email) => runLogin(sender, email),
    status: readAuthStatus,
    wait: waitMs,
    now: Date.now,
    newId: () => randomUUID(),
  }
}

// Whose account a reading taken on this computer belongs to, for whoever has
// to stamp one. Nobody is a real answer: a login Zetrem cannot name must not
// have another account's name asserted for it.
export async function accountHereNow(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null
  return accountHere(hereDeps()).catch(() => null)
}

// The store is the one thing the guard cannot supply: without the keychain
// there is nowhere to file an account, so the operation is refused before it
// asks anyone to stop.
function guarded(
  channel: string,
  work: (deps: AccountsDeps) => Promise<Outcome<AccountList>>,
): (event: { sender: WebContents }) => Promise<Outcome<AccountList>> {
  return (event) =>
    accountWork(channel, (stop) => {
      if (!safeStorage.isEncryptionAvailable())
        return Promise.resolve(lost<AccountList>('unsupported', 'safeStorage unavailable'))
      return work(depsFor(event.sender, stop))
    })
}

// Listing only reads, so it stays off the queue: a browser login holds it for
// up to five minutes and the pane would have nothing to show until then. It
// answers with what the CLI says and no rows rather than throwing across the
// bridge, the way the writing channels answer with lost().
async function currentList(sender: WebContents): Promise<AccountList> {
  try {
    // Listing writes nothing, so it stops nothing: the stop it is handed says
    // so rather than being a stop nobody calls.
    if (safeStorage.isEncryptionAvailable())
      return await listAccounts(depsFor(sender, () => Promise.resolve(true)))
  } catch {
    // The store is unreadable; the CLI can still say who is signed in.
  }
  // With no store there is nothing to match credentials against, so the CLI's
  // own word for the login is all there is to go on.
  const auth = await readAuthStatus()
  const here: AccountList['here'] =
    auth.state === 'signed-in'
      ? { kind: 'named', email: auth.email, orgName: auth.orgName }
      : auth.state === 'signed-out'
        ? { kind: 'signed-out' }
        : { kind: 'unnamed' }
  return { auth, here, accounts: [] }
}

export function registerAccounts(): void {
  handle('accounts:list', (event) => currentList(event.sender))
  handle(
    'accounts:add',
    guarded('accounts:add', (deps) => addAccount(deps)),
  )
  handle('accounts:switch', (event, id) =>
    guarded('accounts:switch', (deps) => switchAccount(deps, id))(event),
  )
  handle('accounts:reauth', (event, id) =>
    guarded('accounts:reauth', (deps) => reauthAccount(deps, id))(event),
  )
  handle('accounts:remove', (event, id) =>
    guarded('accounts:remove', (deps) => removeAccount(deps, id))(event),
  )
}

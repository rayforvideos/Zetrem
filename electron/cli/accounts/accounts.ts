import type {
  AccountHere,
  AccountIdentity,
  AccountList,
  AccountTroubleCode,
  AuthStatus,
} from '@/entities/auth'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import type { AccountsIndex, KeptAccount } from '../../store/accounts-store/accounts-store.types'
import { rowOf } from '../credentials/claude-json/claude-json'
import type { CredentialSnapshot } from '../credentials/credentials.types'
import type { AccountsDeps } from './accounts.types'
import { heldHere, namedBy, presenceOf, sameEmail, whoIsHere } from './who-is-here/who-is-here'
import type { Here, Presence } from './who-is-here/who-is-here.types'

function rowsOf(index: AccountsIndex): AccountList['accounts'] {
  return index.accounts.map(({ id, email, orgName, seenAt }) => ({ id, email, orgName, seenAt }))
}

function rowFor(index: AccountsIndex, id: string | null): KeptAccount | undefined {
  return id === null ? undefined : index.accounts.find((one) => one.id === id)
}

// What the pane shows as signed in follows the credentials, so the name on
// screen and the account the usage report came from are the one answer. Only
// where nothing was matched does the file's own label — which `claude auth
// status` merely echoes — get to speak.
async function authOf(deps: AccountsDeps, index: AccountsIndex, here: Here): Promise<AuthStatus> {
  const status = await deps.status()
  if (status.state === 'cli-missing' || status.state === 'unreachable') return status
  const who = here.who
  if (who.kind === 'signed-out') return { state: 'signed-out' }
  if (who.kind === 'named') return { state: 'signed-in', email: who.email, orgName: who.orgName }
  if (who.kind === 'row') {
    const row = rowFor(index, who.id)
    if (row !== undefined) return { state: 'signed-in', email: row.email, orgName: row.orgName }
  }
  const named = namedBy(here.held)
  if (named !== null) return { state: 'signed-in', email: named.email, orgName: named.orgName }
  return status
}

// The verdict is the pane's word for it too: what the pane draws as here is
// what the credentials matched, and nothing else.
async function listOf(deps: AccountsDeps, index: AccountsIndex, here: Here): Promise<AccountList> {
  const shown: AccountHere = here.who
  return { auth: await authOf(deps, index, here), here: shown, accounts: rowsOf(index) }
}

// A row filed before .claude.json caught up carries no name, and the one name
// it must never take: whatever was showing when it was filed. When the file
// finally says something else for the very credentials this row holds, that is
// the catch-up, and the row takes it. Another row left naming that account
// holds an older token for the same login, so it goes with its slot.
//
// Only a row still waiting for its name is healed. A row that was named when
// it was filed keeps that name: the file disagreeing with it later is the file
// lagging behind something else, and renaming on that is how a row ends up
// wearing the account it replaced.
async function heal(deps: AccountsDeps, index: AccountsIndex, here: Here): Promise<void> {
  if (here.who.kind !== 'row') return
  const row = rowFor(index, here.who.id)
  if (row === undefined || row.email.length > 0) return
  const named = namedBy(here.held)
  if (named === null) return
  if (sameEmail(named.email, row.notNamed ?? null)) return
  const kept: KeptAccount = {
    id: row.id,
    email: named.email,
    orgName: named.orgName,
    seenAt: row.seenAt,
  }
  if (row.accountUuid !== undefined) kept.accountUuid = row.accountUuid
  const stale = index.accounts.filter(
    (one) => one.id !== row.id && sameEmail(one.email, named.email),
  )
  index.accounts = index.accounts
    .filter((one) => !stale.some((gone) => gone.id === one.id))
    .map((one) => (one.id === row.id ? kept : one))
  if (stale.some((one) => one.id === index.activeId)) index.activeId = row.id
  for (const one of stale) await deps.store.removeSlot(one.id)
  await deps.store.save(index)
}

async function listNow(deps: AccountsDeps, index: AccountsIndex): Promise<AccountList> {
  const here = await whoIsHere(deps, index)
  // The list is what the pane has to draw with; a keychain that would not
  // answer leaves it with rows and no verdict rather than nothing at all.
  if (!here.ok) {
    return { auth: await deps.status(), here: { kind: 'unnamed' }, accounts: rowsOf(index) }
  }
  await heal(deps, index, here.value)
  return listOf(deps, index, here.value)
}

export async function listAccounts(deps: AccountsDeps): Promise<AccountList> {
  return listNow(deps, await deps.store.load())
}

// A live claude shares the one keychain item and the one .credentials.json
// every account is filed from, and refreshes its own tokens into them. So an
// operation that is about to write asks the children to go first, and says so
// plainly when one will not: nothing moves, and the turn stays alive.
function stillRunning<T>(): Outcome<T> {
  return lost('timeout', 'a Claude Code process would not stop')
}

// Whether these credentials are the slot's own to keep, which is the same
// bytes already filed there and nothing else. A name is not evidence: the
// label lags a login by minutes, so a slot filed on one would be filed on the
// account that has just been replaced, and that account's login is then gone.
//
// The price is that a token a live claude renewed is not re-filed either,
// being indistinguishable from a stranger's: the slot goes on holding the
// token from before the refresh. That token's refresh token outlives the
// access token by a long way, so the CLI renews from it again on next use.
// Re-filing a renewal is only safe inside an operation that wrote the previous
// credentials itself with no login in between, which is not what this is.
function belongsTo(who: Presence, id: string): boolean {
  return who.kind === 'row' && who.id === id
}

// The credentials are the machine's and stay untouched; the label filed beside
// them is reconciled to the row, so a slot never carries a name that belongs
// to the account before it and a later read cannot mistake the lag for a
// rename.
function slotFor(held: CredentialSnapshot, row: KeptAccount): CredentialSnapshot {
  if (row.email.length === 0) return held
  const named = namedBy(held)
  if (named !== null && sameEmail(named.email, row.email)) return held
  const label: Record<string, unknown> = {
    emailAddress: row.email,
    organizationName: row.orgName,
  }
  if (row.accountUuid !== undefined) label.accountUuid = row.accountUuid
  return { credentials: held.credentials, oauthAccount: label }
}

// What the machine holds now goes back to the active slot, but only when the
// machine still byte-matches that row: the label filed beside those bytes is
// reconciled to the row's own name, so a slot the file has slipped a lag onto
// stops carrying the account before it. Bytes that match nothing are left
// alone, being a stranger's login or a renewal there is no telling apart.
async function keepCurrent(deps: AccountsDeps, index: AccountsIndex): Promise<Outcome<Here>> {
  const here = await whoIsHere(deps, index)
  if (!here.ok) return here
  const { who, held } = here.value
  const active = rowFor(index, index.activeId)
  if (active !== undefined && belongsTo(who, active.id)) {
    await deps.store.writeSlot(active.id, slotFor(held, active))
    await deps.store.save(index)
  }
  return here
}

// The login child is gone before the CLI has finished with it: it answers the
// browser callback first, writes the credentials promptly after, and writes
// the name in .claude.json whenever it gets round to it. Five seconds is far
// longer than the credentials take and short enough that a login the person
// cancelled still answers while they watch.
const SETTLE_MS = 5000
const LOOK_EVERY_MS = 250

type Look = {
  held: CredentialSnapshot
  who: Presence
  // The name to file the login under, or nobody while the file is still
  // showing the account that has just been replaced.
  identity: AccountIdentity | null
  // What the file was showing before the login, so a later read can tell it
  // catching up from it still lagging.
  wasNamed: string | null
  landed: boolean
}

// Nothing but the credentials says a sign-in happened: the CLI's own status is
// an echo of a file that has not been written yet.
function moved(before: CredentialSnapshot, held: CredentialSnapshot): boolean {
  return held.credentials !== null && held.credentials !== before.credentials
}

// A re-auth is the exception, since signing in again as the account already on
// this computer can leave every byte exactly as it was. That is also what the
// machine looks like while the login child is still writing, so it is only
// taken once the deadline has passed and nothing has moved: taking it sooner
// files the tokens from before the login and never sees the rotated ones.
function landedNow(
  before: CredentialSnapshot,
  held: CredentialSnapshot,
  who: Presence,
  refreshing: KeptAccount | null,
): boolean {
  if (held.credentials === null) return false
  if (moved(before, held)) return true
  return refreshing !== null && belongsTo(who, refreshing.id)
}

// A name worth filing is one the login brought: somebody other than whoever
// was here before, or — for a renewal, which asks for one account by name —
// that account. The old name repeated is the file lagging, and filing the new
// login under it would hand this login to the account it replaced.
function freshName(
  named: AccountIdentity | null,
  wasNamed: string | null,
  refreshing: KeptAccount | null,
): AccountIdentity | null {
  if (named === null) return null
  if (refreshing !== null && sameEmail(named.email, refreshing.email)) return named
  return sameEmail(named.email, wasNamed) ? null : named
}

// The two writes a login makes are waited for in turn on one deadline: the
// credentials, which say it happened, and then the name, which says who. A
// name that never arrives leaves the row unnamed — a placeholder a later read
// can heal — rather than named after the account it has just replaced.
async function settled(
  deps: AccountsDeps,
  index: AccountsIndex,
  before: CredentialSnapshot,
  refreshing: KeptAccount | null,
): Promise<Outcome<Look>> {
  const wasNamed = namedBy(before)?.email ?? null
  let waited = 0
  let read = await heldHere(deps)
  if (!read.ok) return read
  let who = await presenceOf(deps, index, read.value)
  while (!moved(before, read.value) && waited < SETTLE_MS) {
    await deps.wait(LOOK_EVERY_MS)
    waited += LOOK_EVERY_MS
    read = await heldHere(deps)
    if (!read.ok) return read
    who = await presenceOf(deps, index, read.value)
  }
  const landed = landedNow(before, read.value, who, refreshing)
  // The name is read again on every look, not once when the credentials moved:
  // .claude.json is a second write the CLI makes when it gets round to it, and
  // one that arrives inside the deadline is the name this login is filed under.
  let identity = landed ? freshName(namedBy(read.value), wasNamed, refreshing) : null
  while (landed && identity === null && waited < SETTLE_MS) {
    await deps.wait(LOOK_EVERY_MS)
    waited += LOOK_EVERY_MS
    read = await heldHere(deps)
    if (!read.ok) return read
    who = await presenceOf(deps, index, read.value)
    identity = freshName(namedBy(read.value), wasNamed, refreshing)
  }
  return won({ held: read.value, who, identity, wasNamed, landed })
}

// A login that never signed in leaves one of two machines behind, and only one
// of them is Zetrem's to undo. Nothing at all is the cancelled login, which the
// machine is put back from; the account that was already here needs no putting
// back, and writing it again would spend the tokens the CLI has renewed since.
async function giveBack(
  deps: AccountsDeps,
  index: AccountsIndex,
  before: CredentialSnapshot,
  wasActive: string | null,
  look: Look,
): Promise<Outcome<AccountList>> {
  if (look.held.credentials === null && before.credentials !== null) await deps.write(before)
  index.activeId = wasActive
  await deps.store.save(index)
  return lost('failed', 'login did not sign in')
}

// Which row this login is. Credentials that match a slot are that row and no
// argument; a renewal that came back with the name it asked for is the row it
// asked for; a name the login brought is matched by name. A login with no name
// yet is nobody's row but its own, because the alternative is filing it onto
// the account it replaced and destroying that account's tokens.
function knownRow(
  index: AccountsIndex,
  look: Look,
  refreshing: KeptAccount | null,
): KeptAccount | undefined {
  if (look.who.kind === 'row') return rowFor(index, look.who.id)
  const identity = look.identity
  if (identity === null) return undefined
  if (refreshing !== null && sameEmail(identity.email, refreshing.email)) {
    return rowFor(index, refreshing.id)
  }
  return index.accounts.find((one) => sameEmail(one.email, identity.email))
}

// The login already happened, so the machine holds this account whether or not
// the store accepts it. There is nothing to roll back to that would be truer,
// and a silent failure here is what leaves a login nobody can find again.
async function record(
  deps: AccountsDeps,
  index: AccountsIndex,
  look: Look,
  refreshing: KeptAccount | null,
): Promise<Outcome<AccountList>> {
  const known = knownRow(index, look, refreshing)
  const kept: KeptAccount = {
    id: known?.id ?? deps.newId(),
    email: look.identity?.email ?? known?.email ?? '',
    orgName: look.identity?.orgName ?? known?.orgName ?? null,
    seenAt: deps.now(),
  }
  if (kept.email.length === 0 && look.wasNamed !== null) kept.notNamed = look.wasNamed
  // Best effort only, and never a decider: the file's uuid is kept when the
  // file's name is the one being filed, otherwise whatever the row already had.
  const uuid = sameEmail(namedBy(look.held)?.email ?? null, kept.email)
    ? (rowOf(look.held)?.accountUuid ?? known?.accountUuid)
    : known?.accountUuid
  if (uuid !== undefined) kept.accountUuid = uuid
  try {
    await deps.store.writeSlot(kept.id, slotFor(look.held, kept))
    index.accounts = known
      ? index.accounts.map((one) => (one.id === kept.id ? kept : one))
      : [...index.accounts, kept]
    index.activeId = kept.id
    await deps.store.save(index)
  } catch (cause: unknown) {
    console.error('[accounts] could not save the account that just signed in', cause)
    const why = cause instanceof Error ? cause.message : String(cause)
    const named = kept.email.length === 0 ? 'an account it could not name' : kept.email
    return lost(
      'failed',
      `this computer is signed in as ${named}, an account Zetrem could not save: ${why}`,
    )
  }
  return won(await listOf(deps, index, { who: { kind: 'row', id: kept.id }, held: look.held }))
}

async function capture(
  deps: AccountsDeps,
  index: AccountsIndex,
  before: CredentialSnapshot,
  wasActive: string | null,
  refreshing: KeptAccount | null,
): Promise<Outcome<AccountList>> {
  const look = await settled(deps, index, before, refreshing)
  // The login may well have happened; with the machine unreadable there is no
  // saying so, and nothing is written back over it on a guess.
  if (!look.ok) return look
  if (!look.value.landed) return giveBack(deps, index, before, wasActive, look.value)
  return record(deps, index, look.value, refreshing)
}

export async function addAccount(deps: AccountsDeps): Promise<Outcome<AccountList>> {
  const index = await deps.store.load()
  if (!(await deps.stop())) return stillRunning()
  const wasActive = index.activeId
  const before = await keepCurrent(deps, index)
  if (!before.ok) return before
  await deps.login(null)
  return capture(deps, index, before.value.held, wasActive, null)
}

async function moveTo(
  deps: AccountsDeps,
  index: AccountsIndex,
  id: string,
): Promise<Outcome<AccountList>> {
  if (rowFor(index, id) === undefined) return lost('refused', `no account ${id}`)
  if (index.activeId === id) {
    const here = await whoIsHere(deps, index)
    if (!here.ok) return here
    // The account is already on the machine, with tokens the CLI may have
    // renewed since; writing the slot over them would put back an older login.
    if (belongsTo(here.value.who, id)) return won(await listOf(deps, index, here.value))
  }
  const slot = await deps.store.readSlot(id)
  if (slot === null) return lost('failed', `no credentials kept for ${id}`)
  if (!(await deps.stop())) return stillRunning()
  const wasActive = index.activeId
  const before = await keepCurrent(deps, index)
  if (!before.ok) return before
  // The index names the account whose credentials the machine is about to
  // hold, before it holds them: both slots are whole either way, and a
  // failure in between leaves a machine that no longer matches the active
  // row, which keepCurrent refuses to file.
  index.activeId = id
  await deps.store.save(index)
  await deps.write(slot)
  // Zetrem wrote the bytes, so Zetrem reads them back: a switch needs nothing
  // from the CLI, whose status is an echo of a file that lags for minutes.
  const landed = await heldHere(deps)
  if (!landed.ok || landed.value.credentials !== slot.credentials) {
    await deps.write(before.value.held)
    index.activeId = wasActive
    await deps.store.save(index)
    // What state the CLI reported says nothing a person can act on; what
    // happened is that the credentials were written and never confirmed.
    const notConfirmed: AccountTroubleCode = 'switch-not-confirmed'
    return lost('failed', notConfirmed)
  }
  const who = await presenceOf(deps, index, landed.value)
  return won(await listOf(deps, index, { who, held: landed.value }))
}

export async function switchAccount(deps: AccountsDeps, id: string): Promise<Outcome<AccountList>> {
  return moveTo(deps, await deps.store.load(), id)
}

export async function reauthAccount(deps: AccountsDeps, id: string): Promise<Outcome<AccountList>> {
  const index = await deps.store.load()
  const moved = await moveTo(deps, index, id)
  if (!moved.ok) return moved
  // The move may have had nothing to do, the row being the one already here;
  // the login that follows writes either way.
  if (!(await deps.stop())) return stillRunning()
  const before = await heldHere(deps)
  if (!before.ok) return before
  const wasActive = index.activeId
  const refreshing = rowFor(index, id) ?? null
  // A row still waiting for its name has none to steer the page with, and the
  // person picks the account there as they would for an add.
  const asking = refreshing !== null && refreshing.email.length > 0 ? refreshing.email : null
  await deps.login(asking)
  return capture(deps, index, before.value, wasActive, refreshing)
}

// Forgetting a row takes nothing off the machine, active or not: the login it
// held stays on this computer, it simply no longer matches a row, so `here`
// becomes named or unnamed until the person adds or switches. Nothing is
// signed out and nothing is switched, so no live session is disturbed.
export async function removeAccount(deps: AccountsDeps, id: string): Promise<Outcome<AccountList>> {
  const index = await deps.store.load()
  if (rowFor(index, id) === undefined) return lost('refused', `no account ${id}`)
  await deps.store.removeSlot(id)
  index.accounts = index.accounts.filter((one) => one.id !== id)
  if (index.activeId === id) index.activeId = null
  await deps.store.save(index)
  return won(await listNow(deps, index))
}

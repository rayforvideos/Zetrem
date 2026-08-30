import { describe, expect, it } from 'vitest'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { CredentialSnapshot } from '../credentials/credentials.types'
import { emptyIndex } from '../../store/accounts-store/accounts-store'
import type { AccountsIndex, AccountsStore } from '../../store/accounts-store/accounts-store.types'
import { addAccount, listAccounts, reauthAccount, removeAccount, switchAccount } from './accounts'
import type { AccountsDeps } from './accounts.types'

type Who = { name: string; email: string; orgName: string | null }

function who(name: string, orgName: string | null = 'Org'): Who {
  return { name, email: `${name}@example.com`, orgName }
}

const SYS = who('sys')
const U1 = who('u1')
const U2 = who('u2')
const U3 = who('u3')

function tokens(name: string): string {
  return JSON.stringify({ claudeAiOauth: { accessToken: `token-${name}` } })
}

function label(one: Who): unknown {
  return {
    accountUuid: `uuid-${one.name}`,
    emailAddress: one.email,
    organizationName: one.orgName,
  }
}

function snap(one: Who): CredentialSnapshot {
  return { credentials: tokens(one.name), oauthAccount: label(one) }
}

function memoryStore(): AccountsStore & {
  index: AccountsIndex
  slots: Map<string, CredentialSnapshot>
} {
  const slots = new Map<string, CredentialSnapshot>()
  const box = {
    index: emptyIndex(),
    slots,
    async load() {
      return structuredClone(box.index)
    },
    async save(index: AccountsIndex) {
      box.index = structuredClone(index)
    },
    async readSlot(id: string) {
      return slots.get(id) ?? null
    },
    async writeSlot(id: string, snapshot: CredentialSnapshot) {
      slots.set(id, snapshot)
    },
    async removeSlot(id: string) {
      slots.delete(id)
    },
  }
  return box
}

// The machine as it really is: one set of credentials, written the instant a
// login lands, and one name in .claude.json written whenever the CLI gets
// round to it. `claude auth status` is not a second source — it reads that
// same name — so the fake answers both from the one field.
type Machine = { credentials: string | null; file: Who | null }

type World = {
  deps: AccountsDeps
  store: ReturnType<typeof memoryStore>
  machine: Machine
  // A live turn: still running unless the operation asked it to stop.
  child: { running: boolean; goes: boolean }
  // Time as the code asks for it, never as the test spends it: onWait is where
  // the machine changes under a wait that costs nothing.
  clock: { waited: number; onWait: ((waited: number) => void) | null }
}

function held(machine: Machine): CredentialSnapshot {
  return {
    credentials: machine.credentials,
    oauthAccount: machine.file === null ? null : label(machine.file),
  }
}

function world(one: Who | null): World {
  const store = memoryStore()
  const machine: Machine = {
    credentials: one === null ? null : tokens(one.name),
    file: one,
  }
  const child = { running: true, goes: true }
  const clock = { waited: 0, onWait: null as ((waited: number) => void) | null }
  let ids = 0
  const deps: AccountsDeps = {
    store,
    stop: async () => {
      if (!child.goes) return false
      child.running = false
      return true
    },
    read: async () => won(held(machine)),
    write: async (snapshot) => {
      machine.credentials = snapshot.credentials
      const account = snapshot.oauthAccount as { emailAddress?: string } | null
      machine.file =
        account === null || account === undefined || typeof account.emailAddress !== 'string'
          ? null
          : nameOf(account.emailAddress, snapshot)
    },
    login: async () => undefined,
    status: async () =>
      machine.file === null
        ? { state: 'signed-out' }
        : { state: 'signed-in', email: machine.file.email, orgName: machine.file.orgName },
    wait: async (ms: number) => {
      clock.waited += ms
      clock.onWait?.(clock.waited)
    },
    now: () => 1000,
    newId: () => `a${++ids}`,
  }
  return { deps, store, machine, child, clock }
}

// A snapshot written back names its account by email; the fake keeps the same
// Who so its label round-trips byte for byte.
function nameOf(email: string, snapshot: CredentialSnapshot): Who {
  const account = snapshot.oauthAccount as { organizationName?: unknown }
  const orgName = typeof account.organizationName === 'string' ? account.organizationName : null
  return { name: email.split('@')[0] ?? email, email, orgName }
}

// A login writes the credentials, and the name after it, each on its own
// clock. `namesAfterMs` of null is the file that never catches up at all.
function lands(w: World, one: Who, credsAfterMs = 0, namesAfterMs: number | null = 0): void {
  w.deps.login = async () => {
    if (credsAfterMs === 0) w.machine.credentials = tokens(one.name)
    if (namesAfterMs === 0) w.machine.file = one
    if (credsAfterMs === 0 && namesAfterMs === 0) return
    const credsAt = w.clock.waited + credsAfterMs
    const namesAt = namesAfterMs === null ? null : w.clock.waited + namesAfterMs
    w.clock.onWait = (waited) => {
      if (credsAfterMs > 0 && waited >= credsAt) w.machine.credentials = tokens(one.name)
      if (namesAt !== null && waited >= namesAt) w.machine.file = one
    }
  }
}

function landsNowhere(w: World): void {
  w.deps.login = async () => undefined
}

function signsOut(w: World): void {
  w.deps.login = async () => {
    w.machine.credentials = null
    w.machine.file = null
  }
}

async function twoAccounts(): Promise<World> {
  const w = world(SYS)
  lands(w, U1)
  await addAccount(w.deps)
  lands(w, U2)
  await addAccount(w.deps)
  landsNowhere(w)
  return w
}

describe('listAccounts', () => {
  it('reports the rows and who this computer is holding', async () => {
    const w = world(U1)
    expect(await listAccounts(w.deps)).toEqual({
      auth: { state: 'signed-in', email: 'u1@example.com', orgName: 'Org' },
      here: { kind: 'named', email: 'u1@example.com', orgName: 'Org' },
      accounts: [],
    })
  })

  // The exact state this computer is in: the keychain holds B's token, which
  // is B's kept slot to the byte, while .claude.json — and so `claude auth
  // status`, which only echoes it — still says A.
  it('shows the account the credentials belong to, not the one the file names', async () => {
    const w = await twoAccounts()
    w.machine.file = U1
    const list = await listAccounts(w.deps)
    expect(list.here).toEqual({ kind: 'row', id: 'a2' })
    expect(list.auth).toEqual({ state: 'signed-in', email: 'u2@example.com', orgName: 'Org' })
  })

  it('puts nobody here when a login outside Zetrem has no name yet', async () => {
    const w = await twoAccounts()
    w.machine.credentials = tokens('outside')
    w.machine.file = null
    const list = await listAccounts(w.deps)
    expect(list.here).toEqual({ kind: 'unnamed' })
  })

  it('names an outside login the file has caught up with, without keeping it', async () => {
    const w = await twoAccounts()
    const outside = who('outside')
    w.machine.credentials = tokens('outside')
    w.machine.file = outside
    const list = await listAccounts(w.deps)
    expect(list.here).toEqual({ kind: 'named', email: 'outside@example.com', orgName: 'Org' })
    expect(list.accounts.map((one) => one.email)).toEqual(['u1@example.com', 'u2@example.com'])
  })

  it('says signed out when this computer holds nothing', async () => {
    const w = world(null)
    const list = await listAccounts(w.deps)
    expect(list.here).toEqual({ kind: 'signed-out' })
    expect(list.auth).toEqual({ state: 'signed-out' })
  })

  it('answers with rows and no verdict rather than nothing when the keychain will not read', async () => {
    const w = await twoAccounts()
    w.deps.read = async () => lost('failed', 'User interaction is not allowed.')
    const list = await listAccounts(w.deps)
    expect(list.here).toEqual({ kind: 'unnamed' })
    expect(list.accounts).toHaveLength(2)
  })
})

describe('addAccount', () => {
  it('captures the new login, keeping nothing of the prior machine login', async () => {
    const w = world(SYS)
    lands(w, U1)
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The machine's prior SYS login is not saved anywhere: only the account
    // the person adds is kept, and there is no anonymous default slot.
    expect(w.store.slots.size).toBe(1)
    expect(result.value.accounts).toEqual([
      { id: 'a1', email: 'u1@example.com', orgName: 'Org', seenAt: 1000 },
    ])
    expect(result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
  })

  it('keeps only the added login when the machine was signed out', async () => {
    const w = world(null)
    lands(w, U1)
    await addAccount(w.deps)
    expect(w.store.slots.size).toBe(1)
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(w.store.index.activeId).toBe('a1')
  })

  it('refreshes the active slot before logging in, from the bytes it filed there', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    // The tokens are u1's own, still; only the label has slipped back to the
    // account before it, which is the lag and nothing else.
    w.machine.file = SYS
    lands(w, U2)
    await addAccount(w.deps)
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(w.store.index.activeId).toBe('a2')
  })

  it('leaves the active slot alone when the token here is one it cannot place', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    // Either a live claude rotated u1's token or a login outside Zetrem
    // replaced u1 before the label moved. The bytes are the same either way,
    // so u1's slot keeps the login Zetrem knows is u1's.
    w.machine.credentials = tokens('u1-renewed')
    lands(w, U2)
    await addAccount(w.deps)
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(w.store.index.activeId).toBe('a2')
  })

  it('never files a token into the slot of an account it does not belong to', async () => {
    const w = await twoAccounts()
    // An outside login replaced u2 on the machine and nothing names what it
    // left. u2's slot must keep u2's tokens, whatever happens next.
    w.machine.credentials = tokens('outside')
    w.machine.file = null
    lands(w, U3)
    await addAccount(w.deps)
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('fails without changing the list when login did not sign in', async () => {
    const w = world(null)
    const result = await addAccount(w.deps)
    expect(result).toEqual({ ok: false, why: { code: 'failed', said: 'login did not sign in' } })
    expect(w.store.index.accounts).toEqual([])
  })

  it('a cancelled login after two accounts leaves the previous account intact, even twice in a row', async () => {
    const w = await twoAccounts()
    signsOut(w)
    const first = await addAccount(w.deps)
    expect(first.ok).toBe(false)
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.index.activeId).toBe('a2')
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
    const second = await addAccount(w.deps)
    expect(second.ok).toBe(false)
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.index.activeId).toBe('a2')
  })

  it('waits for the login that landed, not for the account that was already here', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    // The child is gone the moment the browser answers; claude writes the
    // credentials a second and a half later and the name after those.
    lands(w, U2, 1500, 2000)
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts.map((one) => one.email)).toEqual([
      'u1@example.com',
      'u2@example.com',
    ])
    expect(result.value.here).toEqual({ kind: 'row', id: 'a2' })
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('fails a cancelled login, though the account already here is still signed in', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    landsNowhere(w)
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(false)
    expect(w.store.index.accounts.map((one) => one.email)).toEqual(['u1@example.com'])
    expect(w.store.index.activeId).toBe('a1')
    expect(held(w.machine)).toEqual(snap(U1))
  })

  it('refuses to add an account when the sign-in on this computer cannot be read', async () => {
    const w = world(U1)
    // The keychain is there and holds somebody; it just could not be read.
    w.deps.read = async () => lost('failed', 'User interaction is not allowed.')
    let writes = 0
    w.deps.write = async () => {
      writes += 1
    }
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.why.said).toBe('credentials-unreadable')
    expect(writes).toBe(0)
    expect(w.store.slots.size).toBe(0)
    expect(w.store.index.accounts).toEqual([])
  })

  it('keeps no anonymous default even when a login throws mid-add', async () => {
    const w = world(SYS)
    w.deps.login = async () => {
      throw new Error('the browser never came back')
    }
    await expect(addAccount(w.deps)).rejects.toThrow()
    // Nothing of the machine's prior login was filed, so a later add captures
    // only the account the person signs in as, with no default slot behind it.
    expect(w.store.slots.size).toBe(0)
    w.machine.credentials = tokens('other')
    w.machine.file = who('other')
    lands(w, U1)
    await addAccount(w.deps)
    expect(w.store.slots.size).toBe(1)
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
  })

  it('says the computer is signed in as an account it could not save', async () => {
    const w = world(SYS)
    lands(w, U1)
    w.store.writeSlot = async () => {
      throw new Error('safeStorage said no')
    }
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.why.said).toContain('u1@example.com')
    expect(result.why.said).toContain('could not save')
  })

  it('waits on the clock it was given, and no longer than the deadline', async () => {
    const w = world(SYS)
    landsNowhere(w)
    const started = Date.now()
    let reads = 0
    const inner = w.deps.read
    w.deps.read = async () => {
      reads += 1
      return inner()
    }
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(false)
    expect(w.clock.waited).toBe(5000)
    expect(reads).toBeLessThanOrEqual(25)
    expect(Date.now() - started).toBeLessThan(500)
  })

  it('gives up on a login that only lands after the deadline has passed', async () => {
    const w = world(SYS)
    lands(w, U1, 5250, 5250)
    const result = await addAccount(w.deps)
    expect(result).toEqual({ ok: false, why: { code: 'failed', said: 'login did not sign in' } })
    expect(w.store.index.accounts).toEqual([])
  })

  it('writes nothing back when the machine still holds the login it started with', async () => {
    const w = world(SYS)
    landsNowhere(w)
    let writes = 0
    w.deps.write = async () => {
      writes += 1
    }
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(false)
    expect(writes).toBe(0)
    expect(held(w.machine)).toEqual(snap(SYS))
    expect(w.store.index.accounts).toEqual([])
    expect(w.store.index.activeId).toBeNull()
  })
})

// The whole defect in one place: a login writes the credentials at once and
// the name in .claude.json seconds or minutes later, and the CLI's own status
// is nothing but an echo of that lagging file.
describe('a login the file has not caught up with', () => {
  // The case there is no telling apart: an outside login to a third account
  // lands while the file still names the row that was active. Byte for byte
  // it is a renewal of that row, so Zetrem claims neither and keeps both
  // slots as they are.
  it('claims no row when an outside login replaced the account the file still names', async () => {
    const w = await twoAccounts()
    w.machine.credentials = tokens('u3')
    w.machine.file = U2
    const list = await listAccounts(w.deps)
    expect(list.here).toEqual({ kind: 'unnamed' })
  })

  it('leaves the row the file names holding its own tokens, whatever runs next', async () => {
    const w = await twoAccounts()
    w.machine.credentials = tokens('u3')
    w.machine.file = U2
    // A switch to another real row must not file the unmatched machine login
    // into the outgoing row's slot: u2's slot keeps u2's tokens.
    const result = await switchAccount(w.deps, 'a1')
    expect(result.ok).toBe(true)
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
    expect(held(w.machine)).toEqual(snap(U1))
  })

  it('files the login under the name the file gives up three polls later', async () => {
    const w = world(SYS)
    lands(w, U1, 0, 750)
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual([
      { id: 'a1', email: 'u1@example.com', orgName: 'Org', seenAt: 1000 },
    ])
    expect(w.store.index.accounts[0]?.notNamed).toBeUndefined()
  })

  it('records the new account once the name arrives, however many polls it takes', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    lands(w, U2, 0, 1250)
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts.map((one) => one.email)).toEqual([
      'u1@example.com',
      'u2@example.com',
    ])
    expect(result.value.here).toEqual({ kind: 'row', id: 'a2' })
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
  })

  it('never files the new login onto the row the file is still naming', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    lands(w, U2, 0, null)
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(true)
    // u1 keeps its own tokens and its own name; the new login is its own row,
    // waiting to be named rather than wearing u1's.
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(w.store.index.accounts.map((one) => one.email)).toEqual(['u1@example.com', ''])
    expect(w.store.index.activeId).toBe('a2')
    expect(w.store.slots.get('a2')?.credentials).toBe(tokens('u2'))
  })

  it('takes the name on a later read, once the file finally says it', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    lands(w, U2, 0, null)
    await addAccount(w.deps)
    // Minutes later the CLI writes the name it had been sitting on.
    w.machine.file = U2
    const list = await listAccounts(w.deps)
    expect(list.accounts.map((one) => one.email)).toEqual(['u1@example.com', 'u2@example.com'])
    expect(list.here).toEqual({ kind: 'row', id: 'a2' })
    expect(w.store.index.accounts[1]?.notNamed).toBeUndefined()
  })

  it('leaves an unnamed row unnamed while the file keeps repeating the old name', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    lands(w, U2, 0, null)
    await addAccount(w.deps)
    const list = await listAccounts(w.deps)
    expect(list.accounts.map((one) => one.email)).toEqual(['u1@example.com', ''])
  })

  it('folds the older row away when the name it heals to is one already kept', async () => {
    const w = await twoAccounts()
    // Add, and sign in as u1 again: a login rotates its tokens, so nothing
    // byte-matches, and the file goes on naming u2 for the whole wait.
    w.deps.login = async () => {
      w.machine.credentials = tokens('u1-again')
    }
    expect((await addAccount(w.deps)).ok).toBe(true)
    expect(w.store.index.accounts.map((one) => one.email)).toEqual([
      'u1@example.com',
      'u2@example.com',
      '',
    ])
    // The file catches up and says u1: the row holding u1's older tokens is
    // the stale one and goes with its slot.
    w.machine.file = U1
    const list = await listAccounts(w.deps)
    expect(list.accounts.map((one) => one.email)).toEqual(['u2@example.com', 'u1@example.com'])
    expect(list.accounts.map((one) => one.id)).toEqual(['a2', 'a3'])
    expect(w.store.slots.has('a1')).toBe(false)
    expect(w.store.index.activeId).toBe('a3')
  })

  it('records a login the file never names at all rather than losing it', async () => {
    const w = world(SYS)
    // Half a login: the tokens are written and nothing ever names them. They
    // are real credentials, so they get a row.
    w.deps.login = async () => {
      w.machine.credentials = tokens('u1')
      w.machine.file = null
    }
    const result = await addAccount(w.deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual([{ id: 'a1', email: '', orgName: null, seenAt: 1000 }])
    expect(w.store.slots.get('a1')?.credentials).toBe(tokens('u1'))
  })
})

describe('switchAccount', () => {
  it('writes the chosen slot to the machine and remembers it as active', async () => {
    const w = await twoAccounts()
    const result = await switchAccount(w.deps, 'a1')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(held(w.machine)).toEqual(snap(U1))
  })

  it('confirms the landing by reading the bytes back, asking the CLI nothing', async () => {
    const w = await twoAccounts()
    let asked = 0
    w.deps.status = async () => {
      asked += 1
      return { state: 'signed-out' }
    }
    const result = await switchAccount(w.deps, 'a1')
    // One ask, and only to draw the pane; the switch itself needed none.
    expect(result.ok).toBe(true)
    expect(asked).toBe(1)
    expect(held(w.machine)).toEqual(snap(U1))
    expect(w.store.index.activeId).toBe('a1')
  })

  it('succeeds though the file and the status lag the whole way through', async () => {
    const w = await twoAccounts()
    // Whatever Zetrem writes, this CLI keeps answering with the account before
    // it. Under the old model that rolled every switch back.
    w.deps.status = async () => ({ state: 'signed-in', email: U2.email, orgName: 'Org' })
    const result = await switchAccount(w.deps, 'a1')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(w.store.index.activeId).toBe('a1')
  })

  it('saves the outgoing account first, under its own name', async () => {
    const w = await twoAccounts()
    // The file has slipped back to naming u1; the tokens are u2's, so the slot
    // is u2's to write and the name filed with them is u2's own.
    w.machine.file = U1
    await switchAccount(w.deps, 'a1')
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('files nothing into the outgoing slot when the token here is not the one it kept', async () => {
    const w = await twoAccounts()
    w.machine.credentials = tokens('u2-renewed')
    await switchAccount(w.deps, 'a1')
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('rolls back when the bytes never reached the machine', async () => {
    const w = await twoAccounts()
    w.deps.write = async () => undefined
    const result = await switchAccount(w.deps, 'a1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.why.said).toBe('switch-not-confirmed')
    expect(w.store.index.activeId).toBe('a2')
  })

  it('refuses a switch rather than file a machine it could not read', async () => {
    const w = await twoAccounts()
    w.deps.read = async () => lost('failed', 'User interaction is not allowed.')
    const result = await switchAccount(w.deps, 'a1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.why.said).toBe('credentials-unreadable')
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
    expect(w.store.index.activeId).toBe('a2')
  })

  it('fails for an unknown id without touching the machine', async () => {
    const w = await twoAccounts()
    const result = await switchAccount(w.deps, 'nope')
    expect(result).toEqual({ ok: false, why: { code: 'refused', said: 'no account nope' } })
    expect(held(w.machine)).toEqual(snap(U2))
  })

  it('a switch to the account already active leaves the machine alone', async () => {
    const w = await twoAccounts()
    // The label has slipped, the tokens have not: the row is here by the only
    // measure there is, so there is nothing to write.
    w.machine.file = U1
    let writes = 0
    w.deps.write = async () => {
      writes += 1
    }
    const result = await switchAccount(w.deps, 'a2')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a2' })
    expect(writes).toBe(0)
    expect(w.machine.credentials).toBe(tokens('u2'))
  })

  it('a switch to the active row whose token moved puts the kept one back', async () => {
    const w = await twoAccounts()
    // Nothing says whether this is u2 renewed or somebody else's login, so the
    // click does what it says: it puts u2 on this computer, from u2's slot.
    w.machine.credentials = tokens('u2-renewed')
    const result = await switchAccount(w.deps, 'a2')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a2' })
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('a re-click of the active row is a no-op even when claude will not answer', async () => {
    const w = await twoAccounts()
    w.machine.file = U1
    w.deps.status = async () => ({ state: 'unreachable', said: 'claude timed out' })
    let writes = 0
    w.deps.write = async () => {
      writes += 1
    }
    let slotWrites = 0
    const wroteSlot = w.store.writeSlot
    w.store.writeSlot = async (id: string, snapshot: CredentialSnapshot) => {
      slotWrites += 1
      await wroteSlot(id, snapshot)
    }
    const result = await switchAccount(w.deps, 'a2')
    expect(result.ok).toBe(true)
    expect(writes).toBe(0)
    expect(slotWrites).toBe(0)
    expect(w.machine.credentials).toBe(tokens('u2'))
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('a failure after the machine is written leaves neither slot holding the other', async () => {
    const w = await twoAccounts()
    const answers = w.deps.status
    w.deps.status = async () => {
      throw new Error('claude went away')
    }
    await expect(switchAccount(w.deps, 'a1')).rejects.toThrow()
    expect(held(w.machine)).toEqual(snap(U1))
    expect(w.store.index.activeId).toBe('a1')
    w.deps.status = answers
    await switchAccount(w.deps, 'a2')
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('restores a row when the index calls it active but the machine holds another', async () => {
    const w = await twoAccounts()
    w.machine.credentials = tokens('u3')
    w.machine.file = U3
    const result = await switchAccount(w.deps, 'a2')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a2' })
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.index.activeId).toBe('a2')
  })

  it('never files the machine under an active row that is a different account', async () => {
    const w = await twoAccounts()
    w.machine.credentials = tokens('u1')
    w.machine.file = U1
    await switchAccount(w.deps, 'a1')
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })
})

describe('reauthAccount', () => {
  it('switches to the account, logs in again and refreshes its slot', async () => {
    const w = await twoAccounts()
    w.deps.login = async () => {
      w.machine.credentials = tokens('u1-fresh')
      w.machine.file = U1
    }
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(w.store.slots.get('a1')).toEqual({
      credentials: tokens('u1-fresh'),
      oauthAccount: label(U1),
    })
    expect(result.ok && result.value.accounts).toHaveLength(2)
  })

  it('renews the row it was asked for though the file never stopped naming it', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    // A renewal asks for one account by name, so the same name back is the
    // answer it asked for, not the file lagging.
    w.deps.login = async () => {
      w.machine.credentials = tokens('u1-rotated')
    }
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok && result.value.accounts.map((one) => one.email)).toEqual(['u1@example.com'])
    expect(w.store.slots.get('a1')).toEqual({
      credentials: tokens('u1-rotated'),
      oauthAccount: label(U1),
    })
  })

  it('waits for the renewed credentials the CLI writes after it answers', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    w.deps.login = async () => {
      w.machine.credentials = null
      w.machine.file = null
      w.clock.onWait = (waited) => {
        if (waited >= 500) {
          w.machine.credentials = tokens('u1-fresh')
          w.machine.file = U1
        }
      }
    }
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok && result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(w.store.slots.get('a1')?.credentials).toBe(tokens('u1-fresh'))
  })

  it('waits for the rotated tokens though the machine still holds the row it is renewing', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    // The login child answers the browser first and writes the rotated tokens
    // after it. Until it does, the machine is byte for byte the row being
    // renewed — which is exactly what a re-auth that changed nothing looks
    // like, so the wait has to run rather than take the first look as the end.
    w.deps.login = async () => {
      w.clock.onWait = (waited) => {
        if (waited >= 750) w.machine.credentials = tokens('u1-rotated')
      }
    }
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok).toBe(true)
    expect(w.store.slots.get('a1')?.credentials).toBe(tokens('u1-rotated'))
    expect(held(w.machine).credentials).toBe(tokens('u1-rotated'))
  })

  it('files the account a re-auth really signed in to, whoever it turned out to be', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    lands(w, U3)
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok).toBe(true)
    expect(held(w.machine)).toEqual(snap(U3))
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(w.store.index.accounts.map((one) => one.email)).toEqual([
      'u1@example.com',
      'u3@example.com',
    ])
    expect(w.store.index.activeId).toBe('a2')
  })

  it('renews the row already on the computer, though the login rewrote nothing', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    landsNowhere(w)
    w.deps.now = () => 2000
    let writes = 0
    w.deps.write = async () => {
      writes += 1
    }
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.accounts).toEqual([
      { id: 'a1', email: 'u1@example.com', orgName: 'Org', seenAt: 2000 },
    ])
    expect(result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(writes).toBe(0)
  })

  it('renews a row that was not on the computer, the switch having put it there', async () => {
    const w = await twoAccounts()
    w.deps.now = () => 3000
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.here).toEqual({ kind: 'row', id: 'a1' })
    expect(result.value.accounts).toEqual([
      { id: 'a1', email: 'u1@example.com', orgName: 'Org', seenAt: 3000 },
      { id: 'a2', email: 'u2@example.com', orgName: 'Org', seenAt: 1000 },
    ])
    expect(held(w.machine)).toEqual(snap(U1))
    expect(w.store.slots.get('a2')).toEqual(snap(U2))
  })

  it('a failed reauth restores the account being renewed, not just the switch', async () => {
    const w = await twoAccounts()
    signsOut(w)
    const result = await reauthAccount(w.deps, 'a1')
    expect(result.ok).toBe(false)
    expect(w.store.slots.get('a1')).toEqual(snap(U1))
    expect(held(w.machine)).toEqual(snap(U1))
    expect(w.store.index.activeId).toBe('a1')
  })
})

describe('removeAccount', () => {
  it('removes a row and its slot, leaving the active machine login exactly as it is', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    const result = await removeAccount(w.deps, 'a1')
    expect(result.ok && result.value.accounts).toEqual([])
    // The machine stays signed in to what it holds; the row is simply gone, so
    // the file's own name is all that is left to speak.
    expect(result.ok && result.value.here).toEqual({
      kind: 'named',
      email: 'u1@example.com',
      orgName: 'Org',
    })
    expect(w.store.slots.has('a1')).toBe(false)
    expect(held(w.machine)).toEqual(snap(U1))
    expect(w.store.index.activeId).toBeNull()
  })

  it('leaves an unmatched machine unnamed after the active row is removed', async () => {
    const w = world(SYS)
    lands(w, U1)
    await addAccount(w.deps)
    // The file has slipped to naming nobody the machine can be placed as.
    w.machine.file = null
    const result = await removeAccount(w.deps, 'a1')
    expect(result.ok && result.value.here).toEqual({ kind: 'unnamed' })
    expect(held(w.machine)).toEqual({ credentials: tokens('u1'), oauthAccount: null })
  })

  it('leaves the machine alone when the removed account was not active', async () => {
    const w = await twoAccounts()
    await removeAccount(w.deps, 'a1')
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.index.activeId).toBe('a2')
  })
})

describe('what a live turn costs, which is nothing unless credentials move', () => {
  async function running(): Promise<World> {
    const w = await twoAccounts()
    w.child.running = true
    return w
  }

  it('leaves the turn running for a switch to the row already on the machine', async () => {
    const w = await running()
    const result = await switchAccount(w.deps, 'a2')
    expect(result.ok).toBe(true)
    expect(w.child.running).toBe(true)
  })

  it('leaves the turn running to remove a row that is not the active one', async () => {
    const w = await running()
    const result = await removeAccount(w.deps, 'a1')
    expect(result.ok).toBe(true)
    expect(w.child.running).toBe(true)
  })

  it('stops it for a switch that really moves the credentials', async () => {
    const w = await running()
    await switchAccount(w.deps, 'a1')
    expect(w.child.running).toBe(false)
  })

  it('leaves the turn running to remove the row the machine is holding', async () => {
    const w = await running()
    // Removing a row takes nothing off the machine, so even the active row's
    // removal disturbs no live session.
    const result = await removeAccount(w.deps, 'a2')
    expect(result.ok).toBe(true)
    expect(w.child.running).toBe(true)
  })

  it('stops it for a re-auth of the row already on the machine, which signs in again', async () => {
    const w = await running()
    w.deps.login = async () => {
      w.machine.credentials = tokens('u2-fresh')
    }
    await reauthAccount(w.deps, 'a2')
    expect(w.child.running).toBe(false)
  })

  it('moves nothing and keeps the turn when the child will not go', async () => {
    const w = await running()
    w.child.goes = false
    const result = await switchAccount(w.deps, 'a1')
    expect(result).toEqual({
      ok: false,
      why: { code: 'timeout', said: 'a Claude Code process would not stop' },
    })
    expect(held(w.machine)).toEqual(snap(U2))
    expect(w.store.index.activeId).toBe('a2')
    expect(w.child.running).toBe(true)
  })

  it('asks before the move and again before the login, since either may write', async () => {
    const w = await running()
    let asked = 0
    const inner = w.deps.stop
    w.deps.stop = () => {
      asked += 1
      return inner()
    }
    lands(w, U1)
    await reauthAccount(w.deps, 'a1')
    expect(asked).toBe(2)
  })
})

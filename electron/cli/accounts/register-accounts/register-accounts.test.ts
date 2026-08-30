import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AccountList, AuthStatus } from '@/entities/auth'
import type { CredentialSnapshot } from '../../credentials/credentials.types'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'

const SIGNED_OUT = { state: 'signed-out' } as const
const NOTHING_HELD = { credentials: null, oauthAccount: null }

const fake = vi.hoisted(() => ({
  userData: '',
  appPath: '/apps/Zetrem/Contents/Resources/app.asar',
  encryption: { available: true },
  login: { hold: null as (() => void) | null, throws: false, asked: [] as (string | null)[] },
  auth: { state: 'signed-out' } as AuthStatus,
  held: { credentials: null, oauthAccount: null } as CredentialSnapshot,
  unreadable: false,
  wrote: [] as CredentialSnapshot[],
  stop: { hold: false, calls: 0, release: null as ((gone: boolean) => void) | null },
  handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
}))

vi.mock('electron', () => ({
  app: { getPath: () => fake.userData, getAppPath: () => fake.appPath },
  safeStorage: {
    isEncryptionAvailable: () => fake.encryption.available,
    encryptString: (text: string) => Buffer.from(text, 'utf8'),
    decryptString: (data: Buffer) => data.toString('utf8'),
  },
}))

vi.mock('../../../ipc/ipc', () => ({
  handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
    fake.handlers.set(channel, listener)
  },
  push: () => undefined,
}))

vi.mock('../../auth/auth', () => ({
  readAuthStatus: async () => fake.auth,
  runLogin: (_sender: unknown, email: string | null) => {
    fake.login.asked.push(email)
    return fake.login.throws
      ? Promise.reject(new Error('the browser never came back'))
      : new Promise<void>((resolve) => (fake.login.hold = resolve))
  },
}))

vi.mock('../../credentials/credentials', () => ({
  realIo: () => ({}),
  // The shape lost() and won() build, written out: a vi.mock factory is
  // hoisted above the imports and can name nothing they bring in.
  readSnapshot: async () =>
    fake.unreadable
      ? { ok: false, why: { code: 'failed', said: 'User interaction is not allowed.' } }
      : { ok: true, value: fake.held },
  writeSnapshot: async (_io: unknown, snapshot: CredentialSnapshot) => {
    fake.wrote.push(snapshot)
    fake.held = snapshot
  },
}))

vi.mock('../../../host/agent-host/agent-host', () => ({
  stopAllAgents: (): Promise<boolean> => {
    fake.stop.calls += 1
    if (!fake.stop.hold) return Promise.resolve(true)
    return new Promise<boolean>((resolve) => {
      fake.stop.release = resolve
    })
  },
}))

vi.mock('../../../spawn/run-settled/run-settled', () => ({
  stopTrackedChildren: (): Promise<boolean> => Promise.resolve(true),
}))

// The wait for the CLI to finish writing after a login is real time; here the
// logins fail on purpose, so it is spent instantly rather than by the clock.
vi.mock('../wait/wait', () => ({ waitMs: (): Promise<void> => Promise.resolve() }))

const { accountWorkInFlight } = await import('../../../spawn/account-work/account-work')
const { registerAccounts, accountsDir } = await import('./register-accounts')

beforeAll(async () => {
  fake.userData = await mkdtemp(join(tmpdir(), 'zt-register-'))
  registerAccounts()
})
afterAll(() => rm(fake.userData, { recursive: true, force: true }))

function call(channel: string, ...args: unknown[]): Promise<unknown> {
  const listener = fake.handlers.get(channel)
  if (listener === undefined) return Promise.reject(new Error(`no handler for ${channel}`))
  return Promise.resolve(listener({ sender: {} }, ...args))
}

describe('accountsDir', () => {
  it('keeps the dev store away from a packaged install’s slots', () => {
    fake.appPath = '/Users/x/dev/Zetrem/out/Zetrem Dev.app/Contents/Resources/app'
    expect(accountsDir()).toBe(join(fake.userData, 'accounts-dev'))
  })

  it('uses the real store once loaded from the shipped asar', () => {
    fake.appPath = '/Applications/Zetrem.app/Contents/Resources/app.asar'
    expect(accountsDir()).toBe(join(fake.userData, 'accounts'))
  })
})

describe('accounts:list', () => {
  it('answers while a login is still running', async () => {
    const adding = call('accounts:add')
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    const list = (await call('accounts:list')) as AccountList
    expect(list.auth).toEqual({ state: 'signed-out' })
    fake.login.hold?.()
    await adding
    fake.login.hold = null
  })

  it('answers with the CLI state instead of throwing when the store is closed', async () => {
    fake.encryption.available = false
    const list = (await call('accounts:list')) as AccountList
    fake.encryption.available = true
    expect(list).toEqual({
      auth: { state: 'signed-out' },
      here: { kind: 'signed-out' },
      accounts: [],
    })
  })
})

describe('the kept usage reading, which belongs to one account', () => {
  const keptUsage = (): string => join(fake.userData, 'usage.json')

  async function keepAReading(): Promise<void> {
    await writeFile(
      keptUsage(),
      JSON.stringify({ report: '5-hour 20%', atMs: Date.now(), who: 'before@un7qi3.co' }),
    )
  }

  // The credentials appear while the login is running, which is what tells a
  // sign-in from a browser the person closed on a machine that never changed.
  async function signInAs(email: string): Promise<Outcome<AccountList>> {
    fake.auth = { state: 'signed-in', email, orgName: null }
    const adding = call('accounts:add')
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    fake.held = {
      credentials: '{"claudeAiOauth":{}}',
      oauthAccount: { accountUuid: email, emailAddress: email },
    }
    fake.login.hold?.()
    fake.login.hold = null
    return (await adding) as Outcome<AccountList>
  }

  it('is thrown away when an account change lands, so nobody is shown another’s limits', async () => {
    await keepAReading()
    const result = await signInAs('after@un7qi3.co')
    expect(result.ok).toBe(true)
    expect(existsSync(keptUsage())).toBe(false)
    fake.auth = SIGNED_OUT
    fake.held = NOTHING_HELD
  })

  it('is left alone when the operation failed, since nothing about the account moved', async () => {
    await keepAReading()
    const result = (await call('accounts:remove', 'no-such-id')) as Outcome<AccountList>
    expect(result.ok).toBe(false)
    expect(existsSync(keptUsage())).toBe(true)
    await rm(keptUsage(), { force: true })
  })
})

describe('a writing channel', () => {
  it('answers lost and leaves the cause in the terminal', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fake.login.throws = true
    const result = (await call('accounts:add')) as Outcome<AccountList>
    fake.login.throws = false
    expect(result).toEqual({
      ok: false,
      why: { code: 'failed', said: 'the browser never came back' },
    })
    expect(logged).toHaveBeenCalledWith(
      '[accounts] accounts:add failed',
      expect.objectContaining({ message: 'the browser never came back' }),
    )
    logged.mockRestore()
  })
})

describe('a live claude, which shares the credentials the change is about to move', () => {
  async function addAnother(email: string): Promise<void> {
    fake.auth = { state: 'signed-in', email, orgName: null }
    const adding = call('accounts:add')
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    // Distinct bytes, so this is a second row rather than a re-file of the one
    // already kept under the shared blob.
    fake.held = {
      credentials: `{"claudeAiOauth":{"who":"${email}"}}`,
      oauthAccount: { accountUuid: email, emailAddress: email },
    }
    fake.login.hold?.()
    fake.login.hold = null
    await adding
  }

  // A real row the byte-matched machine is not resolved to: every kept slot
  // here shares the one credential blob, so the machine always resolves to the
  // first row, and any other row is a switch that really moves credentials —
  // the only kind that stops anything. A second account is added if the store
  // does not yet hold one.
  async function elsewhere(): Promise<string> {
    let list = (await call('accounts:list')) as AccountList
    const hereId = (l: AccountList): string | null => (l.here.kind === 'row' ? l.here.id : null)
    let other = list.accounts.find((a) => a.id !== hereId(list))
    if (other === undefined) {
      await addAnother('second@un7qi3.co')
      list = (await call('accounts:list')) as AccountList
      other = list.accounts.find((a) => a.id !== hereId(list))
    }
    if (other === undefined) throw new Error('need a second account to switch to')
    return other.id
  }

  // Boxed: an async function that answered with the pending switch itself
  // would flatten it and wait for the very change being held up.
  async function heldAtTheStop(): Promise<{ switching: Promise<unknown> }> {
    fake.auth = { state: 'signed-in', email: 'after@un7qi3.co', orgName: null }
    const target = await elsewhere()
    fake.stop.hold = true
    fake.wrote.length = 0
    const switching = call('accounts:switch', target)
    await vi.waitFor(() => expect(fake.stop.release).not.toBeNull())
    return { switching }
  }

  function release(gone: boolean): void {
    fake.stop.release?.(gone)
    fake.stop.release = null
    fake.stop.hold = false
  }

  it('waits for the child to go before the first credential write', async () => {
    const { switching } = await heldAtTheStop()
    expect(fake.wrote).toEqual([])

    release(true)
    const result = (await switching) as Outcome<AccountList>

    expect(result.ok).toBe(true)
    expect(fake.wrote).toHaveLength(1)
  })

  it('answers lost rather than proceed past a child that never went', async () => {
    const { switching } = await heldAtTheStop()

    release(false)
    const result = (await switching) as Outcome<AccountList>

    expect(result).toEqual({
      ok: false,
      why: { code: 'timeout', said: 'a Claude Code process would not stop' },
    })
    expect(fake.wrote).toEqual([])
  })

  it('stops nothing to read the list, which touches no credentials', async () => {
    const before = fake.stop.calls
    await call('accounts:list')
    expect(fake.stop.calls).toBe(before)
    fake.auth = SIGNED_OUT
    fake.held = NOTHING_HELD
  })
})

describe('a keychain that would not answer', () => {
  it('refuses the change rather than act on the file claude left behind', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fake.unreadable = true
    fake.wrote.length = 0
    const result = (await call('accounts:add')) as Outcome<AccountList>
    fake.unreadable = false
    logged.mockRestore()

    expect(result).toEqual({
      ok: false,
      why: { code: 'failed', said: 'credentials-unreadable' },
    })
    expect(fake.wrote).toEqual([])
  })
})

describe('the latch that keeps a new claude out of the middle of an operation', () => {
  it('is held for the whole of it, browser login and all', async () => {
    expect(accountWorkInFlight()).toBe(false)
    const adding = call('accounts:add')
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())

    expect(accountWorkInFlight()).toBe(true)

    fake.login.hold?.()
    fake.login.hold = null
    await adding
    expect(accountWorkInFlight()).toBe(false)
  })

  it('is let go after an operation that failed, or nothing could ever run again', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fake.login.throws = true
    const result = (await call('accounts:add')) as Outcome<AccountList>
    fake.login.throws = false
    logged.mockRestore()

    expect(result.ok).toBe(false)
    expect(accountWorkInFlight()).toBe(false)
  })
})

describe('an operation that asks for the stop twice', () => {
  async function signIn(email: string): Promise<Outcome<AccountList>> {
    fake.auth = { state: 'signed-in', email, orgName: null }
    const adding = call('accounts:add')
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    fake.held = {
      credentials: `{"claudeAiOauth":{"who":"${email}"}}`,
      oauthAccount: { accountUuid: email, emailAddress: email },
    }
    fake.login.hold?.()
    fake.login.hold = null
    return (await adding) as Outcome<AccountList>
  }

  it('stops the children once, not once for the move and once for the login', async () => {
    const first = await signIn('one@un7qi3.co')
    expect(first.ok).toBe(true)
    const one = first.ok && first.value.here.kind === 'row' ? first.value.here.id : null
    expect(await signIn('two@un7qi3.co')).toMatchObject({ ok: true })

    // Back to the first account, whose row the re-auth has to move to before
    // it signs in again: both halves ask, and the children go once.
    fake.auth = { state: 'signed-in', email: 'one@un7qi3.co', orgName: null }
    fake.held = {
      credentials: '{"claudeAiOauth":{"who":"one@un7qi3.co"}}',
      oauthAccount: { accountUuid: 'one@un7qi3.co', emailAddress: 'one@un7qi3.co' },
    }
    const before = fake.stop.calls
    const asking = call('accounts:reauth', one)
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    // Signing in again as the same account renews its token, which is the
    // change on the machine that says the login happened.
    fake.held = {
      credentials: '{"claudeAiOauth":{"who":"one@un7qi3.co","again":true}}',
      oauthAccount: { accountUuid: 'one@un7qi3.co', emailAddress: 'one@un7qi3.co' },
    }
    fake.login.hold?.()
    fake.login.hold = null
    const done = (await asking) as Outcome<AccountList>

    expect(done.ok).toBe(true)
    expect(fake.stop.calls).toBe(before + 1)
    fake.auth = SIGNED_OUT
    fake.held = NOTHING_HELD
  })
})

describe('the account the login page is told to ask for', () => {
  async function signedIn(email: string, bytes: string): Promise<Outcome<AccountList>> {
    fake.auth = { state: 'signed-in', email, orgName: null }
    const adding = call('accounts:add')
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    fake.held = {
      credentials: bytes,
      oauthAccount: { accountUuid: email, emailAddress: email },
    }
    fake.login.hold?.()
    fake.login.hold = null
    return (await adding) as Outcome<AccountList>
  }

  it('is nobody on an add and the row itself on a re-auth', async () => {
    fake.login.asked.length = 0
    const email = 'prefill@un7qi3.co'
    const added = await signedIn(email, `{"claudeAiOauth":{"who":"${email}"}}`)
    expect(added.ok).toBe(true)
    // Nobody: which account an add will sign in as is the browser's to say.
    expect(fake.login.asked).toEqual([null])

    const id = added.ok && added.value.here.kind === 'row' ? added.value.here.id : null
    const asking = call('accounts:reauth', id)
    await vi.waitFor(() => expect(fake.login.hold).not.toBeNull())
    fake.held = {
      credentials: `{"claudeAiOauth":{"who":"${email}","again":true}}`,
      oauthAccount: { accountUuid: email, emailAddress: email },
    }
    fake.login.hold?.()
    fake.login.hold = null
    expect(((await asking) as Outcome<AccountList>).ok).toBe(true)
    expect(fake.login.asked).toEqual([null, email])

    fake.auth = SIGNED_OUT
    fake.held = NOTHING_HELD
  })
})

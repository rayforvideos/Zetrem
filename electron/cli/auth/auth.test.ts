import type { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthStatus } from '@/entities/auth'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'

type FakeStream = EventEmitter & { setEncoding: (encoding: string) => void }
type FakeChild = EventEmitter & { pid: number; stdout: FakeStream; stderr: FakeStream }

const fake = vi.hoisted(() => ({
  spawns: [] as { args: string[]; child: FakeChild }[],
  ran: [] as string[],
  nextPid: 700,
  loggedIn: false,
  stop: { goes: true, calls: 0, latched: [] as boolean[] },
  changes: 0,
  killed: [] as number[],
  handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
  listeners: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
}))

vi.mock('node:child_process', async () => {
  const { EventEmitter: Emitter } = await import('node:events')
  const stream = (): FakeStream => Object.assign(new Emitter(), { setEncoding: () => undefined })
  const execFile = (): void => undefined
  Object.defineProperty(execFile, Symbol.for('nodejs.util.promisify.custom'), {
    value: async (_command: string, args: string[]) => {
      fake.ran.push(args.join(' '))
      return { stdout: JSON.stringify({ loggedIn: fake.loggedIn }), stderr: '' }
    },
  })
  return {
    execFile,
    spawn: (_command: string, args: string[]) => {
      fake.nextPid += 1
      const child = Object.assign(new Emitter(), {
        pid: fake.nextPid,
        stdout: stream(),
        stderr: stream(),
        kill: () => undefined,
      })
      fake.spawns.push({ args, child })
      return child
    },
  }
})

vi.mock('../login-path/login-path', () => ({
  claudeBin: async () => '/usr/local/bin/claude',
  loginPath: async () => '/usr/local/bin',
}))

vi.mock('../../ipc/ipc', () => ({
  handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
    fake.handlers.set(channel, listener)
  },
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
    fake.listeners.set(channel, listener)
  },
  push: () => undefined,
}))

vi.mock('../../spawn/kill-tree/kill-tree', () => ({
  killTree: (pid: number) => {
    fake.killed.push(pid)
  },
}))

vi.mock('../../spawn/run-settled/run-settled', () => ({
  trackChild: () => undefined,
  untrackChild: () => undefined,
  stopTrackedChildren: async () => true,
}))

vi.mock('../../host/agent-host/agent-host', () => ({
  stopAllAgents: async () => {
    fake.stop.calls += 1
    fake.stop.latched.push(accountWorkInFlight())
    return fake.stop.goes
  },
}))

vi.mock('../accounts/account-change/account-change', () => ({
  accountChanged: async () => {
    fake.changes += 1
  },
}))

const { accountWorkInFlight, duringAccountWork } = await import(
  '../../spawn/account-work/account-work'
)
const { registerAuth, runLogin } = await import('./auth')
registerAuth()

function cancelLogin(): void {
  const listener = fake.listeners.get('auth:cancel-login')
  if (listener === undefined) throw new Error('nothing listens on auth:cancel-login')
  listener({})
}

function logout(): Promise<Outcome<AuthStatus>> {
  const listener = fake.handlers.get('auth:logout')
  if (listener === undefined) throw new Error('nothing listens on auth:logout')
  return listener({}) as Promise<Outcome<AuthStatus>>
}

beforeEach(() => {
  fake.spawns.length = 0
  fake.ran.length = 0
  fake.stop.calls = 0
  fake.stop.goes = true
  fake.stop.latched.length = 0
  fake.killed.length = 0
  fake.loggedIn = false
})

describe('the login an account operation runs itself', () => {
  it('still spawns while the operation is holding everything else back', async () => {
    const sender = {} as never
    await duringAccountWork(async () => {
      const login = runLogin(sender)
      await vi.waitFor(() => expect(fake.spawns).toHaveLength(1))
      fake.spawns[0]?.child.emit('close', 0)
      await login
    })

    expect(fake.spawns[0]?.args.slice(-2)).toEqual(['auth', 'login'])
  })
})

describe('the login page, which opens on whichever account the browser last saw', () => {
  async function loginAs(email: string | null): Promise<string[]> {
    const login = runLogin({} as never, email)
    await vi.waitFor(() => expect(fake.spawns).toHaveLength(1))
    fake.spawns[0]?.child.emit('close', 0)
    await login
    return fake.spawns[0]?.args ?? []
  }

  it('is told which account to ask for, so a re-auth need not touch the switcher', async () => {
    const args = await loginAs('ray@un7qi3.co')
    expect(args.slice(-4)).toEqual(['auth', 'login', '--email', 'ray@un7qi3.co'])
  })

  it('names nobody for a new account, there being nobody yet to name', async () => {
    const args = await loginAs(null)
    expect(args.slice(-2)).toEqual(['auth', 'login'])
    expect(args).not.toContain('--email')
  })
})

describe('a login the person gave up waiting for', () => {
  it('kills the child that is running, so the operation gets its turn back', async () => {
    const sender = {} as never
    const login = runLogin(sender)
    await vi.waitFor(() => expect(fake.spawns).toHaveLength(1))
    const pid = fake.spawns[0]?.child.pid

    cancelLogin()
    await login

    expect(fake.killed).toEqual([pid])
  })

  it('does nothing at all when no login is running', () => {
    expect(() => cancelLogin()).not.toThrow()
    expect(fake.killed).toEqual([])
  })

  it('is done with the child, so a later cancel kills no one', async () => {
    const sender = {} as never
    const login = runLogin(sender)
    await vi.waitFor(() => expect(fake.spawns).toHaveLength(1))
    fake.spawns[0]?.child.emit('close', 0)
    await login

    cancelLogin()

    expect(fake.killed).toEqual([])
  })
})

describe('auth:logout, which writes the credentials every account is filed from', () => {
  it('stops the children first, and holds the latch while it runs', async () => {
    const result = await logout()

    expect(result.ok).toBe(true)
    expect(fake.stop.calls).toBe(1)
    expect(fake.stop.latched).toEqual([true])
    expect(fake.ran).toEqual(['auth logout', 'auth status --json'])
    expect(accountWorkInFlight()).toBe(false)
  })

  it('raises the account-changed signal, so nothing of the old account is left', async () => {
    const before = fake.changes
    await logout()
    expect(fake.changes).toBe(before + 1)
  })

  it('signs nobody out, and says so, when a session will not stop', async () => {
    fake.stop.goes = false
    const before = fake.changes
    const result = await logout()

    expect(result).toEqual({
      ok: false,
      why: { code: 'timeout', said: 'a Claude Code process would not stop' },
    })
    expect(fake.ran).toEqual([])
    expect(fake.changes).toBe(before)
  })
})

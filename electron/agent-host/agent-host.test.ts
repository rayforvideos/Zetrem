import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunConfig } from '@/entities/agent-session/model/run-config/run-config.types'

type FakeStream = EventEmitter & { setEncoding: (encoding: string) => void }

type FakeStdin = {
  destroyed: boolean
  writable: boolean
  written: string[]
  write: (line: string) => boolean
  on: (name: string, listener: () => void) => void
}

type FakeChild = EventEmitter & {
  pid: number | undefined
  stdin: FakeStdin
  stdout: FakeStream
  stderr: FakeStream
}

type Spawn = { command: string; args: string[]; child: FakeChild }

type Message = { id: string; kind: string; line?: string; code?: number | null; reason?: unknown }

type Renderer = {
  heard: Message[]
  close: () => void
  event: { sender: { isDestroyed: () => boolean; send: (channel: string, message: Message) => void } }
}

type Channel = (event: Renderer['event'], ...args: unknown[]) => unknown

// Everything the host touches outside itself is mocked here, and every mock
// writes into this one record, so a test reads the outside world from one place.
const boundary = vi.hoisted(() => ({
  channels: new Map<string, Channel>(),
  spawns: [] as Spawn[],
  killed: [] as number[],
  killedSync: [] as number[],
  beforeQuit: [] as (() => void)[],
  project: null as string | null,
  userData: '',
  nextPid: 4200,
  holdLogin: false,
  releaseLogin: null as (() => void) | null,
}))

vi.mock('electron', () => ({
  app: {
    getPath: () => boundary.userData,
    on: (name: string, listener: () => void) => {
      if (name === 'before-quit') boundary.beforeQuit.push(listener)
    },
  },
}))

vi.mock('../ipc/ipc', () => ({
  handle: (channel: string, listener: Channel) => boundary.channels.set(channel, listener),
  on: (channel: string, listener: Channel) => boundary.channels.set(channel, listener),
}))

vi.mock('node:child_process', async () => {
  const { EventEmitter: Emitter } = await import('node:events')
  const stream = (): FakeStream =>
    Object.assign(new Emitter(), { setEncoding: () => undefined })
  return {
    spawn: (command: string, args: string[]) => {
      const written: string[] = []
      boundary.nextPid += 1
      const child = Object.assign(new Emitter(), {
        pid: boundary.nextPid,
        stdin: {
          destroyed: false,
          writable: true,
          written,
          write: (line: string) => {
            written.push(line)
            return true
          },
          on: () => undefined,
        },
        stdout: stream(),
        stderr: stream(),
        kill: () => undefined,
      })
      boundary.spawns.push({ command, args, child })
      return child
    },
  }
})

vi.mock('../login-path/login-path', () => ({
  claudeBin: async () => '/usr/local/bin/claude',
  loginPath: async () => {
    if (boundary.holdLogin) {
      await new Promise<void>((release) => {
        boundary.releaseLogin = release
      })
    }
    return '/usr/local/bin'
  },
}))

vi.mock('../project-memory/project-memory', () => ({ recallProject: async () => boundary.project }))

vi.mock('../kill-tree/kill-tree', () => ({
  killTree: (pid: number) => boundary.killed.push(pid),
  killTreeSync: (pid: number) => boundary.killedSync.push(pid),
}))

const config: RunConfig = {
  permissionMode: 'ask',
  model: 'default',
  persona: '',
  people: [],
  lock: null,
}

function renderer(): Renderer {
  const heard: Message[] = []
  const window = { open: true }
  return {
    heard,
    close: () => {
      window.open = false
    },
    event: {
      sender: {
        isDestroyed: () => !window.open,
        send: (_channel: string, message: Message) => {
          heard.push(message)
        },
      },
    },
  }
}

function fire(channel: string, one: Renderer, ...args: unknown[]): unknown {
  const listener = boundary.channels.get(channel)
  if (listener === undefined) throw new Error(`nothing listens on ${channel}`)
  return listener(one.event, ...args)
}

async function startAgent(one: Renderer, id: unknown, prompt: unknown, files: unknown = []): Promise<void> {
  await fire('agent:start', one, id, prompt, config, files)
}

function childAt(at: number): FakeChild {
  const spawn = boundary.spawns[at]
  if (spawn === undefined) throw new Error(`no child was spawned at ${at}`)
  return spawn.child
}

// The held start parks inside loginPath, and it is only parked once loginPath
// has handed back the release. Waiting on ticks rather than a timer keeps the
// test honest about where the start actually is.
async function untilParked(): Promise<void> {
  for (let tick = 0; tick < 100 && boundary.releaseLogin === null; tick += 1) {
    await Promise.resolve()
  }
  if (boundary.releaseLogin === null) throw new Error('the start never reached the login path')
}

async function releaseStart(started: unknown): Promise<void> {
  boundary.releaseLogin?.()
  await started
}

const of = (one: Renderer, kind: string): Message[] => one.heard.filter((message) => message.kind === kind)

let host: { registerAgentHost: () => void; killAllAgents: () => void }

beforeEach(async () => {
  boundary.channels.clear()
  boundary.spawns.length = 0
  boundary.killed.length = 0
  boundary.killedSync.length = 0
  boundary.beforeQuit.length = 0
  boundary.project = null
  boundary.nextPid = 4200
  boundary.holdLogin = false
  boundary.releaseLogin = null
  boundary.userData = mkdtempSync(join(tmpdir(), 'zetrem-agent-host-'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.resetModules()
  host = await import('./agent-host')
  host.registerAgentHost()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('what the child says reaches the renderer, and its death is told once', () => {
  it('turns stdout into lines, even when a line arrives in two pieces', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const child = childAt(0)

    child.stdout.emit('data', 'first\nsec')
    child.stdout.emit('data', 'ond\n')

    expect(of(one, 'line').map((message) => message.line)).toEqual(['first', 'second'])
  })

  it('tells the workspace it settled on before any line', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    expect(one.heard[0]).toMatchObject({ id: 'a1', kind: 'workspace' })
  })

  it('reports a clean exit once and forgets the agent', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const child = childAt(0)

    child.emit('close', 0)
    fire('agent:send', one, 'a1', 'anyone there')

    expect(of(one, 'exit')).toEqual([{ id: 'a1', kind: 'exit', code: 0, reason: null }])
    expect(child.stdin.written).toHaveLength(1)
  })

  it('carries the error stderr said earlier, not the quiet chunk that followed', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const child = childAt(0)

    child.stderr.emit('data', 'Error: the model refused\n')
    child.stderr.emit('data', '\n   \n')
    child.emit('close', 1)

    expect(of(one, 'exit')[0]).toMatchObject({
      code: 1,
      reason: { code: 'cli-said', said: 'Error: the model refused' },
    })
  })

  it('says exit once when error and close both fire for the one child', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const child = childAt(0)

    child.emit('error', new Error('the pipe broke'))
    child.emit('close', 1)

    expect(of(one, 'exit')).toHaveLength(1)
    expect(of(one, 'exit')[0]).toMatchObject({ code: -1, reason: { code: 'start-failed' } })
  })
})

describe('a stop that lands while the agent is still starting', () => {
  it('spawns nothing, because the last word on spawning comes after the wait', async () => {
    const one = renderer()
    boundary.holdLogin = true
    const started = fire('agent:start', one, 'a1', 'hello', config, [])
    await untilParked()

    fire('agent:stop', one, 'a1')
    await releaseStart(started)

    expect(boundary.spawns).toHaveLength(0)
    expect(of(one, 'exit')).toEqual([{ id: 'a1', kind: 'exit', code: -1, reason: null }])
  })

  it('throws away the text typed in that window, so the next agent does not read it', async () => {
    const one = renderer()
    boundary.holdLogin = true
    const started = fire('agent:start', one, 'a1', 'hello', config, [])
    await untilParked()
    fire('agent:send', one, 'a1', 'said to the one that never came')
    fire('agent:stop', one, 'a1')
    await releaseStart(started)

    boundary.holdLogin = false
    boundary.releaseLogin = null
    await startAgent(one, 'a1', 'hello again')

    expect(childAt(0).stdin.written).toHaveLength(1)
    expect(childAt(0).stdin.written[0]).toContain('hello again')
  })
})

describe('text typed while the agent is starting', () => {
  it('waits for the stdin and follows the opening prompt in the order it was typed', async () => {
    const one = renderer()
    boundary.holdLogin = true
    const started = fire('agent:start', one, 'a1', 'the opening prompt', config, [])
    await untilParked()

    fire('agent:send', one, 'a1', 'first after')
    fire('agent:send', one, 'a1', 'second after')
    await releaseStart(started)

    const said = childAt(0).stdin.written
    expect(said).toHaveLength(3)
    expect(said[0]).toContain('the opening prompt')
    expect(said[1]).toContain('first after')
    expect(said[2]).toContain('second after')
  })
})

describe('an id that is already running', () => {
  it('says nothing on a second start, because an exit would mean the live one died', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    one.heard.length = 0

    await startAgent(one, 'a1', 'hello again')

    expect(one.heard).toEqual([])
    expect(boundary.spawns).toHaveLength(1)
  })

  it('keeps the agent that holds the id when an older child of the same id dies', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const first = childAt(0)
    fire('agent:stop', one, 'a1')
    await startAgent(one, 'a1', 'hello again')
    const second = childAt(1)

    first.emit('close', 0)
    fire('agent:send', one, 'a1', 'still listening')

    expect(second.stdin.written).toHaveLength(2)
    expect(second.stdin.written[1]).toContain('still listening')
  })
})

describe('a window that went away', () => {
  it('kills the child rather than write into a closed renderer', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const child = childAt(0)

    one.close()
    child.stdout.emit('data', 'nobody is reading this\n')

    expect(boundary.killed).toEqual([child.pid])
    expect(of(one, 'line')).toEqual([])
  })

  it('kills it once, however much output is still on its way', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    const child = childAt(0)

    one.close()
    child.stdout.emit('data', 'one\n')
    child.stdout.emit('data', 'two\n')
    child.stdout.emit('data', 'three\n')

    expect(boundary.killed).toEqual([child.pid])
  })
})

describe('quitting the app', () => {
  it('kills every live child on the way out', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')
    await startAgent(one, 'a2', 'hello')

    host.killAllAgents()

    expect(boundary.killedSync).toEqual([childAt(0).pid, childAt(1).pid])
  })

  // main.ts already drops every child at before-quit; a second listener here
  // would kill the same trees twice.
  it('leaves the quit listener to main, and registers none of its own', () => {
    expect(boundary.beforeQuit).toEqual([])
  })

  it('forgets them too, so text sent afterwards goes nowhere', async () => {
    const one = renderer()
    await startAgent(one, 'a1', 'hello')

    host.killAllAgents()
    fire('agent:send', one, 'a1', 'after the lights went out')

    expect(childAt(0).stdin.written).toHaveLength(1)
  })
})

describe('a start that was never going to work', () => {
  it('says nothing when the id is not even text, since there is nobody to tell', async () => {
    const one = renderer()
    await startAgent(one, 7, 'hello')

    expect(one.heard).toEqual([])
    expect(boundary.spawns).toEqual([])
  })

  it('reports an exit with no reason when the prompt is not text', async () => {
    const one = renderer()
    await startAgent(one, 'a1', null)

    expect(one.heard).toEqual([{ id: 'a1', kind: 'exit', code: -1, reason: null }])
    expect(boundary.spawns).toEqual([])
  })

  it('reports an exit with no reason for an id with a path hidden in it', async () => {
    const one = renderer()
    await startAgent(one, '../../etc/passwd', 'hello')

    expect(one.heard).toEqual([
      { id: '../../etc/passwd', kind: 'exit', code: -1, reason: null },
    ])
    expect(boundary.spawns).toEqual([])
  })
})

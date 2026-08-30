import type { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeStream = EventEmitter & { setEncoding: (encoding: string) => void }

type FakeChild = EventEmitter & {
  pid: number | undefined
  stdout: FakeStream
  stderr: FakeStream
  kill: () => void
}

type Spawn = { command: string; args: string[]; options: Record<string, unknown>; child: FakeChild }

const boundary = vi.hoisted(() => ({
  spawns: [] as Spawn[],
  killed: [] as number[],
  killedSync: [] as number[],
  plainKills: 0,
  nextPid: 900 as number | undefined,
  buried: new Set<number>(),
}))

vi.mock('node:child_process', async () => {
  const { EventEmitter: Emitter } = await import('node:events')
  const stream = (): FakeStream => Object.assign(new Emitter(), { setEncoding: () => undefined })
  return {
    spawn: (command: string, args: string[], options: Record<string, unknown>) => {
      if (typeof boundary.nextPid === 'number') boundary.nextPid += 1
      const child = Object.assign(new Emitter(), {
        pid: boundary.nextPid,
        stdout: stream(),
        stderr: stream(),
        kill: () => {
          boundary.plainKills += 1
        },
      })
      boundary.spawns.push({ command, args, options, child })
      return child
    },
  }
})

vi.mock('../pid-alive/pid-alive', () => ({
  pidAlive: (pid: number) => !boundary.buried.has(pid),
}))

vi.mock('../kill-tree/kill-tree', () => ({
  killTree: (pid: number) => boundary.killed.push(pid),
  killTreeSync: (pid: number) => boundary.killedSync.push(pid),
}))

import { duringAccountWork } from '../account-work/account-work'
import {
  killTrackedChildren,
  runSettled,
  stopTrackedChildren,
  trackChild,
  untrackChild,
} from './run-settled'

function childAt(at: number): FakeChild {
  const spawn = boundary.spawns[at]
  if (spawn === undefined) throw new Error(`no child was spawned at ${at}`)
  return spawn.child
}

function optionsAt(at: number): Record<string, unknown> {
  const spawn = boundary.spawns[at]
  if (spawn === undefined) throw new Error(`no child was spawned at ${at}`)
  return spawn.options
}

const plain = {
  bin: '/usr/local/bin/claude',
  args: ['--version'],
  timeout: { ms: 5000, answers: () => 'gave up' },
  exit: (code: number | null, text: string) => `${String(code)}:${text}`,
  error: (cause: Error) => `broke:${cause.message}`,
  refused: () => 'not now',
}

beforeEach(() => {
  boundary.spawns.length = 0
  boundary.killed.length = 0
  boundary.killedSync.length = 0
  boundary.plainKills = 0
  boundary.nextPid = 900
  boundary.buried.clear()
})

afterEach(() => {
  vi.useRealTimers()
  killTrackedChildren()
  boundary.killed.length = 0
})

describe('a short run that ends on its own', () => {
  it('hands back what the exit made of the output', async () => {
    const run = runSettled(plain)
    const child = childAt(0)

    child.stdout.emit('data', 'claude 2.0.1\n')
    child.emit('close', 0)

    expect(await run).toBe('0:claude 2.0.1\n')
  })

  it('leaves stderr out unless it was asked for', async () => {
    const apart = runSettled(plain)
    childAt(0).stderr.emit('data', 'a warning')
    childAt(0).emit('close', 0)
    expect(await apart).toBe('0:')

    const together = runSettled({ ...plain, mergeStderr: true })
    childAt(1).stdout.emit('data', 'out ')
    childAt(1).stderr.emit('data', 'and err')
    childAt(1).emit('close', 0)
    expect(await together).toBe('0:out and err')
  })

  it('answers the error rather than the exit when the binary is missing', async () => {
    const run = runSettled(plain)

    childAt(0).emit('error', new Error('ENOENT'))
    childAt(0).emit('close', null)

    expect(await run).toBe('broke:ENOENT')
  })

  it('spawns where and with what it was told, and hides the Windows console', async () => {
    const run = runSettled({ ...plain, cwd: '/home/ray', env: { PATH: '/opt/bin' } })
    childAt(0).emit('close', 0)
    await run

    expect(optionsAt(0)).toEqual({
      cwd: '/home/ray',
      env: { PATH: '/opt/bin' },
      windowsHide: true,
    })
  })

  it('passes no cwd at all when none was named, rather than an empty one', async () => {
    const run = runSettled(plain)
    childAt(0).emit('close', 0)
    await run

    expect('cwd' in optionsAt(0)).toBe(false)
  })
})

describe('a run that is watching for one line', () => {
  it('settles on the first line that answers, even split across chunks', async () => {
    const run = runSettled<string | null>({
      ...plain,
      timeout: { ms: 5000, answers: () => null },
      line: (line) => (line.startsWith('found') ? line : undefined),
      exit: () => null,
      error: () => null,
    })
    const child = childAt(0)

    child.stdout.emit('data', 'noise\nfou')
    child.stdout.emit('data', 'nd it\nlater\n')

    expect(await run).toBe('found it')
  })

  it('gives up once the unfinished line outgrows the cap', async () => {
    const run = runSettled<string | null>({
      ...plain,
      timeout: { ms: 5000, answers: () => null },
      cap: { bytes: 8, answers: () => null },
      line: (line) => (line === 'found' ? line : undefined),
      exit: () => 'exited',
      error: () => null,
    })

    childAt(0).stdout.emit('data', 'a line with no end in sight')

    expect(await run).toBeNull()
  })

  // The cap is read after the chunk has been split, so an init line that arrives
  // in the same chunk that overshoots is still the answer.
  it('reads the whole chunk before the cap can end the run', async () => {
    const run = runSettled<string | null>({
      ...plain,
      timeout: { ms: 5000, answers: () => null },
      cap: { bytes: 4, answers: () => null },
      line: (line) => (line === 'found' ? line : undefined),
      exit: () => null,
      error: () => null,
    })

    childAt(0).stdout.emit('data', 'found\nand a long tail after it')

    expect(await run).toBe('found')
  })
})

describe('a run that says too much', () => {
  it('cuts the output at the cap', async () => {
    const run = runSettled({
      ...plain,
      cap: { bytes: 5, answers: (text: string) => text.slice(0, 5) },
    })

    childAt(0).stdout.emit('data', 'far too much text')

    expect(await run).toBe('far t')
  })
})

describe('a run that never ends', () => {
  it('kills the tree and answers with what the timeout makes of the output', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const run = runSettled({
      ...plain,
      timeout: { ms: 5000, answers: (text: string) => `stopped after ${text}` },
    })
    const child = childAt(0)
    child.stdout.emit('data', 'half a word')

    await vi.advanceTimersByTimeAsync(5000)

    expect(await run).toBe('stopped after half a word')
    expect(boundary.killed).toEqual([child.pid])
  })

  it('falls back to the plain kill when the spawn never got a pid', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    boundary.nextPid = undefined
    const run = runSettled(plain)

    await vi.advanceTimersByTimeAsync(5000)

    expect(await run).toBe('gave up')
    expect(boundary.killed).toEqual([])
    expect(boundary.plainKills).toBe(1)
  })
})

describe('what is left running after the answer is in hand', () => {
  it('leaves a child that exited on its own alone', async () => {
    const run = runSettled(plain)
    childAt(0).emit('close', 0)
    await run

    expect(boundary.killed).toEqual([])
  })

  it('kills the tree on any settle when the caller asked for it, since a probe leaves a live CLI', async () => {
    const run = runSettled({ ...plain, killOnSettle: true })
    const child = childAt(0)
    child.emit('close', 0)
    await run

    expect(boundary.killed).toEqual([child.pid])
  })

  it('kills once, however many ways the run tries to end', async () => {
    const run = runSettled({ ...plain, killOnSettle: true })
    const child = childAt(0)
    child.emit('close', 0)
    child.emit('error', new Error('too late'))
    child.emit('close', 1)

    expect(await run).toBe('0:')
    expect(boundary.killed).toEqual([child.pid])
  })

  it('tells the caller the pid on the way in and on the way out', async () => {
    const seen: string[] = []
    const run = runSettled({
      ...plain,
      spawned: (pid: number) => seen.push(`in ${String(pid)}`),
      settled: (pid: number) => seen.push(`out ${String(pid)}`),
    })
    const child = childAt(0)
    child.emit('close', 0)
    await run

    expect(seen).toEqual([`in ${String(child.pid)}`, `out ${String(child.pid)}`])
  })
})

describe('stopping the one-shot children before the account underneath them moves', () => {
  it('does not answer until the last tracked run has settled', async () => {
    trackChild(11)
    trackChild(12)
    let answered = false
    const stopped = stopTrackedChildren(5000).then((gone) => {
      answered = true
      return gone
    })

    untrackChild(11)
    await Promise.resolve()
    await Promise.resolve()
    expect(answered).toBe(false)
    expect(boundary.killed).toEqual([11, 12])

    untrackChild(12)
    expect(await stopped).toBe(true)
  })

  it('says the children are gone when nothing was tracked', async () => {
    expect(await stopTrackedChildren(5000)).toBe(true)
  })

  it('lets the operation through for a pid the process table no longer knows', async () => {
    trackChild(11)
    boundary.buried.add(11)

    // Its 'close' never came and never will: a grandchild inherited the stdio.
    // Refusing every account change from here to quit is not an answer.
    expect(await stopTrackedChildren(1000)).toBe(true)
    expect(boundary.killed).toEqual([])
  })

  it('says so, and leaves it running, when one will not go', async () => {
    vi.useFakeTimers()
    try {
      trackChild(11)
      const stopped = stopTrackedChildren(1000)
      await vi.advanceTimersByTimeAsync(1000)

      expect(await stopped).toBe(false)
      // Asked, not killed: the account change is refused instead, and whoever
      // was in the middle of a turn still has it.
      expect(boundary.killed).toEqual([11])
      expect(boundary.killedSync).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('a run whose answer is in hand while its process is not yet gone', () => {
  it('is still counted as running, and the wait holds until it closes', async () => {
    const run = runSettled<string | null>({
      ...plain,
      killOnSettle: true,
      timeout: { ms: 5000, answers: () => null },
      line: (line) => (line.startsWith('init') ? line : undefined),
      exit: () => null,
      error: () => null,
      spawned: trackChild,
      settled: untrackChild,
    })
    const child = childAt(0)
    child.stdout.emit('data', 'init\n')
    expect(await run).toBe('init')

    let answered = false
    const stopped = stopTrackedChildren(5000).then((gone) => {
      answered = true
      return gone
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(answered).toBe(false)

    child.emit('close', 0)
    expect(await stopped).toBe(true)
  })
})

describe('the children that outlive the window they were started from', () => {
  it('kills what is still tracked, and only that', () => {
    trackChild(11)
    trackChild(12)
    untrackChild(11)

    killTrackedChildren()

    expect(boundary.killed).toEqual([12])
  })

  it('forgets them, so a second quit kills nothing twice', () => {
    trackChild(11)

    killTrackedChildren()
    killTrackedChildren()

    expect(boundary.killed).toEqual([11])
  })
})

describe('an account operation that begins while a caller is getting ready to run', () => {
  it('stops the spawn, because the latch is asked again beside the spawn itself', async () => {
    let letGo = (): void => undefined
    const operation = duringAccountWork(
      () =>
        new Promise<void>((release) => {
          letGo = release
        }),
    )
    // The caller asked the latch when it was down and then awaited the binary,
    // the PATH and the project; by now an account operation holds it.
    const answered = runSettled(plain)
    letGo()
    await operation

    expect(await answered).toBe('not now')
    expect(boundary.spawns).toEqual([])
  })
})

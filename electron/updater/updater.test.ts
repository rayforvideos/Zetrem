import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Channel = (event: unknown, ...args: unknown[]) => unknown
type Downloaded = (info: { version: string }) => void

// Everything the module touches outside itself is mocked here, and every mock
// writes into this one record, so a test reads the outside world from one place.
const boundary = vi.hoisted(() => ({
  channels: new Map<string, Channel>(),
  packaged: true,
  flags: {} as Record<string, boolean>,
  listeners: new Map<string, Downloaded>(),
  bound: [] as string[],
  handled: [] as string[],
  checks: 0,
  checkFails: false,
  installs: 0,
  sent: [] as { channel: string; version: unknown }[],
  windows: [] as unknown[],
}))

vi.mock('electron', () => ({
  app: {
    get isPackaged(): boolean {
      return boundary.packaged
    },
    whenReady: async () => undefined,
  },
  BrowserWindow: {
    getAllWindows: () => boundary.windows,
  },
}))

vi.mock('electron-updater', () => ({
  autoUpdater: {
    set autoDownload(on: boolean) {
      boundary.flags.autoDownload = on
    },
    set autoInstallOnAppQuit(on: boolean) {
      boundary.flags.autoInstallOnAppQuit = on
    },
    set allowPrerelease(on: boolean) {
      boundary.flags.allowPrerelease = on
    },
    on: (name: string, listener: Downloaded) => {
      boundary.bound.push(name)
      boundary.listeners.set(name, listener)
    },
    checkForUpdates: async () => {
      boundary.checks += 1
      if (boundary.checkFails) throw new Error('offline')
      return null
    },
    quitAndInstall: () => {
      boundary.installs += 1
    },
  },
}))

vi.mock('../ipc/ipc', () => ({
  handle: (channel: string, listener: Channel) => {
    boundary.handled.push(channel)
    boundary.channels.set(channel, listener)
  },
}))

function fakeWindow(): unknown {
  return {
    webContents: {
      send: (channel: string, version: unknown) => boundary.sent.push({ channel, version }),
    },
  }
}

function fire(channel: string, ...args: unknown[]): unknown {
  const listener = boundary.channels.get(channel)
  if (listener === undefined) throw new Error(`nothing listens on ${channel}`)
  return listener({}, ...args)
}

function downloaded(version: string): void {
  const listener = boundary.listeners.get('update-downloaded')
  if (listener === undefined) throw new Error('nothing listens for update-downloaded')
  listener({ version })
}

// whenReady resolves on the microtask queue, so the launch check lands a tick
// after registerUpdater returns.
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

async function register(): Promise<void> {
  vi.resetModules()
  const updater = await import('./updater')
  updater.registerUpdater()
  await settle()
}

beforeEach(() => {
  boundary.channels.clear()
  boundary.packaged = true
  boundary.flags = {}
  boundary.listeners.clear()
  boundary.bound.length = 0
  boundary.handled.length = 0
  boundary.checks = 0
  boundary.checkFails = false
  boundary.installs = 0
  boundary.sent = []
  boundary.windows = [fakeWindow()]
  // Only the recheck clock is faked; the promise flush below still needs a real
  // setImmediate.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('what the renderer can ask about an update', () => {
  it('answers that nothing is waiting before any download finishes', async () => {
    await register()

    expect(await fire('updater:state')).toBeNull()
  })

  it('answers with the version once one is downloaded, since a reload misses the push', async () => {
    await register()

    downloaded('1.0.0-beta.2')

    expect(await fire('updater:state')).toBe('1.0.0-beta.2')
  })

  it('hands a restart straight to electron-updater', async () => {
    await register()

    fire('updater:restart')

    expect(boundary.installs).toBe(1)
  })
})

describe('a development launch', () => {
  it('answers the renderer but never reaches for a release', async () => {
    boundary.packaged = false

    await register()

    expect([...boundary.channels.keys()]).toEqual(['updater:state', 'updater:restart'])
    expect(boundary.listeners.size).toBe(0)
    expect(boundary.checks).toBe(0)
  })
})

describe('a packaged launch', () => {
  it('downloads on its own and takes prereleases, which is all Zetrem has shipped', async () => {
    await register()

    expect(boundary.flags).toEqual({
      autoDownload: true,
      autoInstallOnAppQuit: true,
      allowPrerelease: true,
    })
  })

  it('tells every open window the version that is ready', async () => {
    boundary.windows = [fakeWindow(), fakeWindow()]
    await register()

    downloaded('1.0.0-beta.2')

    expect(boundary.sent).toEqual([
      { channel: 'updater:ready', version: '1.0.0-beta.2' },
      { channel: 'updater:ready', version: '1.0.0-beta.2' },
    ])
  })

  it('checks once the app is ready, and again a workday later', async () => {
    await register()
    expect(boundary.checks).toBe(1)

    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000)

    expect(boundary.checks).toBe(2)
  })

  it('takes the first registration only, so a second call doubles nothing', async () => {
    vi.resetModules()
    const updater = await import('./updater')

    updater.registerUpdater()
    updater.registerUpdater()
    await settle()

    expect(boundary.bound).toEqual(['update-downloaded'])
    expect(boundary.handled).toEqual(['updater:state', 'updater:restart'])
    expect(boundary.checks).toBe(1)

    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000)

    expect(boundary.checks).toBe(2)
  })

  it('lets a failed check pass, since being offline is not an error to raise', async () => {
    boundary.checkFails = true

    await register()

    expect(boundary.checks).toBe(1)
  })
})

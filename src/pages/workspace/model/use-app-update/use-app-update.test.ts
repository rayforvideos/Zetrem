import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Everything the hook touches outside itself is mocked here, and every mock
// writes into this one record, so a test reads the outside world from one place.
const boundary = vi.hoisted(() => ({
  state: null as string | null,
  ready: [] as ((version: string) => void)[],
  unsubscribed: 0,
  toasts: [] as { duration: unknown }[],
  dismissed: [] as unknown[],
}))

vi.mock('sonner', () => ({
  toast: {
    custom: (_render: unknown, options: { duration: unknown }) => {
      boundary.toasts.push({ duration: options.duration })
      return boundary.toasts.length
    },
    dismiss: (id: unknown) => {
      boundary.dismissed.push(id)
    },
  },
}))

// The tests run without a DOM, so React's two hooks are stood in for and the
// effect is run by hand below rather than by a renderer.
const react = vi.hoisted(() => ({
  slots: [] as { current: unknown }[],
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
}))

vi.mock('react', async (importActual) => {
  const actual = await importActual<typeof import('react')>()
  return {
    ...actual,
    useRef: (initial: unknown) => {
      const slot = react.slots[react.cursor] ?? { current: initial }
      react.slots[react.cursor] = slot
      react.cursor += 1
      return slot
    },
    useEffect: (effect: () => void | (() => void)) => {
      react.effects.push(effect)
    },
  }
})

const { useAppUpdate } = await import('./use-app-update')

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

async function mount(): Promise<() => void> {
  react.slots = []
  react.cursor = 0
  react.effects = []
  useAppUpdate()
  const cleanups = react.effects.map((effect) => effect())
  await settle()
  return () => {
    for (const cleanup of cleanups) cleanup?.()
  }
}

function arrives(version: string): void {
  for (const listener of boundary.ready) listener(version)
}

beforeEach(() => {
  boundary.state = null
  boundary.ready = []
  boundary.unsubscribed = 0
  boundary.toasts = []
  boundary.dismissed = []
  vi.stubGlobal('window', {
    desk: {
      updaterState: async () => boundary.state,
      updaterRestart: async () => undefined,
      onUpdaterReady: (listener: (version: string) => void) => {
        boundary.ready.push(listener)
        return () => {
          boundary.unsubscribed += 1
        }
      },
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('an update that was already waiting when the screen mounted', () => {
  it('shows the card, since the push happened before anything was listening', async () => {
    boundary.state = '1.0.0-beta.2'

    await mount()

    expect(boundary.toasts).toHaveLength(1)
  })

  it('leaves the corner alone when nothing is downloaded', async () => {
    await mount()

    expect(boundary.toasts).toEqual([])
  })

  it('keeps the card up until it is answered', async () => {
    boundary.state = '1.0.0-beta.2'

    await mount()

    expect(boundary.toasts[0]?.duration).toBe(Infinity)
  })
})

describe('an update that finishes downloading while the app is open', () => {
  it('shows the card as soon as main says so', async () => {
    await mount()

    arrives('1.0.0-beta.2')

    expect(boundary.toasts).toHaveLength(1)
  })

  it('shows one card for one version, however often main mentions it', async () => {
    await mount()

    arrives('1.0.0-beta.2')
    arrives('1.0.0-beta.2')

    expect(boundary.toasts).toHaveLength(1)
  })

  it('takes the older card down when a newer version lands on top of it', async () => {
    // A session that outlives two releases: beta.3 downloads, then the recheck
    // brings beta.4. Restarting installs only the newest, so one card is true.
    await mount()

    arrives('1.0.0-beta.3')
    arrives('1.0.0-beta.4')

    expect(boundary.toasts).toHaveLength(2)
    expect(boundary.dismissed).toEqual([1])
  })

  it('takes down a card that was waiting at mount, all the same', async () => {
    boundary.state = '1.0.0-beta.3'
    await mount()

    arrives('1.0.0-beta.4')

    expect(boundary.dismissed).toEqual([1])
  })
})

describe('leaving the screen', () => {
  it('stops listening, so a gone screen is never offered anything', async () => {
    const unmount = await mount()

    unmount()

    expect(boundary.unsubscribed).toBe(1)
  })
})

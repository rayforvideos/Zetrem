import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTROL_SYMBOL, GROUND } from '@/shared/config/theme'

// nativeTheme is the whole outside world here, so one fake record stands for it
// and a test reads what the app process did from that one place.
const boundary = vi.hoisted(() => ({
  themeSource: 'system' as string,
  dark: true,
  listeners: [] as (() => void)[],
  dropped: [] as (() => void)[],
}))

vi.mock('electron', () => ({
  nativeTheme: {
    get themeSource(): string {
      return boundary.themeSource
    },
    set themeSource(next: string) {
      boundary.themeSource = next
    },
    get shouldUseDarkColors(): boolean {
      return boundary.dark
    },
    on: (name: string, listener: () => void) => {
      if (name === 'updated') boundary.listeners.push(listener)
    },
    off: (name: string, listener: () => void) => {
      if (name === 'updated') boundary.dropped.push(listener)
    },
  },
}))

const { chromeFor, dressWindow, followScheme, wearTheme } = await import('./app-theme')

type FakeWindow = {
  destroyed: boolean
  painted: string[]
  closers: (() => void)[]
  isDestroyed: () => boolean
  setBackgroundColor: (color: string) => void
  setTitleBarOverlay: (overlay: { color: string }) => void
  once: (name: string, listener: () => void) => void
}

function fakeWindow(): FakeWindow {
  const win: FakeWindow = {
    destroyed: false,
    painted: [],
    closers: [],
    isDestroyed: () => win.destroyed,
    setBackgroundColor: (color) => win.painted.push(color),
    setTitleBarOverlay: () => undefined,
    once: (name, listener) => {
      if (name === 'closed') win.closers.push(listener)
    },
  }
  return win
}

// dressWindow only ever sees a BrowserWindow through the few calls it makes.
const asWindow = (win: FakeWindow) => win as unknown as Parameters<typeof dressWindow>[0]

beforeEach(() => {
  boundary.themeSource = 'system'
  boundary.dark = true
  boundary.listeners = []
  boundary.dropped = []
})

describe('the chosen scheme reaches Electron', () => {
  it('hands the setting straight to themeSource, since the words are the same three', () => {
    wearTheme('dark')
    expect(boundary.themeSource).toBe('dark')
    wearTheme('light')
    expect(boundary.themeSource).toBe('light')
    wearTheme('system')
    expect(boundary.themeSource).toBe('system')
  })
})

describe('the window chrome follows the scheme', () => {
  it('keeps the dark colours the app has always had', () => {
    expect(chromeFor(true)).toEqual({ ground: GROUND.dark, symbol: CONTROL_SYMBOL.dark })
    expect(GROUND.dark).toBe('#000000')
    expect(CONTROL_SYMBOL.dark).toBe('#ededf0')
  })

  it('paints the window white and the controls dark in the light scheme', () => {
    expect(chromeFor(false)).toEqual({ ground: GROUND.light, symbol: CONTROL_SYMBOL.light })
  })

  it('repaints the window when the machine or the setting moves the scheme', () => {
    const win = fakeWindow()
    followScheme(asWindow(win))
    expect(boundary.listeners.length).toBe(1)

    boundary.dark = false
    boundary.listeners[0]?.()
    expect(win.painted).toEqual([GROUND.light])

    boundary.dark = true
    boundary.listeners[0]?.()
    expect(win.painted).toEqual([GROUND.light, GROUND.dark])
  })

  it('lets go of the listener when the window closes, so nothing paints a dead window', () => {
    const win = fakeWindow()
    followScheme(asWindow(win))
    win.closers[0]?.()
    expect(boundary.dropped).toEqual(boundary.listeners)
  })

  it('says nothing to a window that is already gone', () => {
    const win = fakeWindow()
    win.destroyed = true
    dressWindow(asWindow(win))
    expect(win.painted).toEqual([])
  })
})

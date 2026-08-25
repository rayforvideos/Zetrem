import { afterEach, describe, expect, it, vi } from 'vitest'
import { darkScheme, watchScheme } from './scheme'

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  )
  return mql
}

describe('darkScheme: reads the OS preference', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is true when the OS prefers dark', () => {
    mockMatchMedia(true)
    expect(darkScheme()).toBe(true)
  })

  it('is false when the OS prefers light', () => {
    mockMatchMedia(false)
    expect(darkScheme()).toBe(false)
  })
})

describe('watchScheme: subscribing to a scheme change', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers and unregisters a change listener on the query', () => {
    const mql = mockMatchMedia(false)
    const listener = vi.fn()
    const unwatch = watchScheme(listener)
    expect(mql.addEventListener).toHaveBeenCalledWith('change', listener)
    unwatch()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', listener)
  })
})

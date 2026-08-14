import { describe, expect, it } from 'vitest'
import { trusted } from './ipc'

describe('IPC answers only what comes from our own window', () => {
  it('answers the main frame of our window', () => {
    expect(trusted({ hasWindow: true, isMainFrame: true })).toBe(true)
  })

  it('refuses a sender with no window, so stray web contents cannot write files', () => {
    expect(trusted({ hasWindow: false, isMainFrame: true })).toBe(false)
  })

  it('refuses anything but the main frame, so an injected frame cannot spawn a process', () => {
    expect(trusted({ hasWindow: true, isMainFrame: false })).toBe(false)
  })

  it('refuses when neither holds', () => {
    expect(trusted({ hasWindow: false, isMainFrame: false })).toBe(false)
  })
})

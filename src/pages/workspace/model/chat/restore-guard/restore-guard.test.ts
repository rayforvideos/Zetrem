import { describe, expect, it } from 'vitest'
import { mayRestore } from './restore-guard'

describe('mayRestore', () => {
  it('allows restoring an idle, empty session', () => {
    expect(mayRestore({ running: false, turnCount: 0 })).toBe(true)
  })

  it('refuses a session that is running', () => {
    expect(mayRestore({ running: true, turnCount: 0 })).toBe(false)
  })

  it('refuses a session that already has turns on screen', () => {
    expect(mayRestore({ running: false, turnCount: 3 })).toBe(false)
  })
})

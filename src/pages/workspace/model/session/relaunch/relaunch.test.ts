import { describe, expect, it } from 'vitest'
import { shouldRelaunch } from './relaunch'
import type { Attempt } from './relaunch.types'

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return { prompt: 'Carry on', files: [], resumed: true, spoke: false, ...overrides }
}

describe('shouldRelaunch: only when picking the old conversation back up failed', () => {
  it('tries again when a resumed start died without a word, so a pruned session does not stall the app', () => {
    expect(shouldRelaunch(attempt(), 1)).toBe(true)
  })

  it('does not try again after it spoke, so the same prompt is not sent twice', () => {
    expect(shouldRelaunch(attempt({ spoke: true }), 1)).toBe(false)
  })

  it('does not try again for a session that was new to begin with', () => {
    expect(shouldRelaunch(attempt({ resumed: false }), 1)).toBe(false)
  })

  it('treats a clean exit as no failure', () => {
    expect(shouldRelaunch(attempt(), 0)).toBe(false)
  })

  it('has nothing to retry when nothing was started', () => {
    expect(shouldRelaunch(null, 1)).toBe(false)
  })

  it('has nothing to retry once the attempt was let go, which is how stopping says so', () => {
    expect(shouldRelaunch(null, 143)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { fillOf } from './fill'

function call(overrides: Partial<Call> = {}): Call {
  return { id: 'c', line: 'Bash x', startedAtMs: 0, endedAtMs: 100, failed: false, note: '', ...overrides }
}

describe('fillOf: how far a row is filled by how long the call took', () => {
  it('barely fills a call that came straight back', () => {
    expect(fillOf(call({ endedAtMs: 0 }))).toBe(4)
  })

  it('fills further the longer the call ran', () => {
    expect(fillOf(call({ endedAtMs: 30_000 }))).toBeGreaterThan(fillOf(call({ endedAtMs: 1000 })))
    expect(fillOf(call({ endedAtMs: 1000 }))).toBeGreaterThan(fillOf(call({ endedAtMs: 50 })))
  })

  it('stops at the full row, so one long call cannot overrun it', () => {
    expect(fillOf(call({ endedAtMs: 60_000 }))).toBe(100)
    expect(fillOf(call({ endedAtMs: 3_600_000 }))).toBe(100)
  })

  it('leaves a call that has not come back nearly empty, since nothing is known yet', () => {
    expect(fillOf(call({ endedAtMs: null }))).toBe(4)
  })

  it('tolerates an end stamped before the start', () => {
    expect(fillOf(call({ startedAtMs: 900, endedAtMs: 100 }))).toBe(4)
  })
})

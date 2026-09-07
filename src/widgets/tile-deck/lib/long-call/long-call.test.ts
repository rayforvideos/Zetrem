import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { LONG_CALL_MS, longRunning, runningFor } from './long-call'

function call(overrides: Partial<Call> = {}): Call {
  return {
    id: 'c1',
    line: 'Bash npm run dev',
    startedAtMs: 0,
    endedAtMs: null,
    failed: false,
    note: '',
    ...overrides,
  }
}

describe('longRunning: a call that was never going to exit', () => {
  it('says nothing about a call that has only just started', () => {
    expect(longRunning(call(), 1000)).toBe(false)
  })

  it('holds its peace right up to the mark', () => {
    expect(longRunning(call(), LONG_CALL_MS - 1)).toBe(false)
  })

  it('speaks up the moment the call passes the mark', () => {
    expect(longRunning(call(), LONG_CALL_MS)).toBe(true)
  })

  it('says nothing about a call that has already come back, however long it took', () => {
    expect(longRunning(call({ endedAtMs: LONG_CALL_MS }), LONG_CALL_MS * 10)).toBe(false)
  })

  it('waits minutes rather than seconds, so an ordinary build says nothing', () => {
    expect(LONG_CALL_MS).toBeGreaterThanOrEqual(60_000)
  })
})

describe('runningFor: how long, in words that settle', () => {
  it('counts whole minutes, so the chip changes once a minute', () => {
    expect(runningFor(12 * 60_000)).toBe('12m')
    expect(runningFor(12 * 60_000 + 59_999)).toBe('12m')
  })

  it('turns over to hours rather than counting past sixty minutes', () => {
    expect(runningFor(60 * 60_000)).toBe('1h')
    expect(runningFor(125 * 60_000)).toBe('2h 5m')
  })

  it('never counts backwards, whatever clock it is handed', () => {
    expect(runningFor(-5000)).toBe('0m')
  })
})

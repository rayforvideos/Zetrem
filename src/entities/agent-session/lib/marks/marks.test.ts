import { describe, expect, it } from 'vitest'
import type { Call } from '../../model/session.types'
import { marksOf } from './marks'

function call(overrides: Partial<Call> = {}): Call {
  return {
    id: 'c1',
    line: 'Read a.ts',
    startedAtMs: 1000,
    endedAtMs: 1400,
    failed: false,
    note: '',
    ...overrides,
  }
}

describe('marksOf: turning a call log into a strip of marks', () => {
  it('measures a finished call from when it started to when it came back', () => {
    expect(marksOf([call()], 9000, true)[0]!.ms).toBe(400)
  })

  it('grows an open call against the clock while the agent is still working', () => {
    const open = call({ endedAtMs: null })
    expect(marksOf([open], 3000, true)[0]!.ms).toBe(2000)
    expect(marksOf([open], 3000, true)[0]!.running).toBe(true)
  })

  it('stops an open call from pulsing forever once the agent has stopped', () => {
    const open = call({ endedAtMs: null })
    expect(marksOf([open], 999_999, false)[0]!.running).toBe(false)
  })

  it('claims no duration for a call that never came back', () => {
    const open = call({ endedAtMs: null })
    expect(marksOf([open], 999_999, false)[0]!.ms).toBe(0)
  })

  it('tolerates a clock reading behind the call it is measuring', () => {
    const open = call({ startedAtMs: 5000, endedAtMs: null })
    expect(marksOf([open], 1000, true)[0]!.ms).toBe(0)
  })

  it('carries the failure through', () => {
    expect(marksOf([call({ failed: true })], 9000, true)[0]!.failed).toBe(true)
  })
})

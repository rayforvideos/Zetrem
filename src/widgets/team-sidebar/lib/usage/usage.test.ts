import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { spendLine, usageRows, waitingLine } from './usage'

const EMPTY: StatusState = {
  session: null,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    ttftMs: null,
    turns: 0,
  },
  limits: [],
  hooks: [],
  update: null,
  activity: 'idle',
}

function state(patch: Partial<StatusState>): StatusState {
  return { ...EMPTY, ...patch }
}

describe('usageRows: what the account and the chat have spent', () => {
  it('says nothing at all before the session has reported anything', () => {
    expect(usageRows(EMPTY)).toEqual([])
  })

  it('shows the tokens this chat holds before the window size is known', () => {
    const rows = usageRows(state({ context: { used: 40_000, window: null } }))
    expect(rows[0]).toMatchObject({ key: 'context', percent: null, amount: '40.0k' })
  })

  it('reads a weekly limit as a share used, with when it comes back', () => {
    const rows = usageRows(
      state({
        limits: [
          { kind: 'seven_day', utilization: 0.5, resetsAtMs: 1787173200000, overage: false, status: 'allowed' },
        ],
      }),
    )
    expect(rows[0]).toMatchObject({ key: 'seven_day', label: 'Weekly', percent: 50, warn: false })
    expect(rows[0]?.hint).toContain('resets')
  })

  it('marks a limit that is no longer simply allowed', () => {
    const rows = usageRows(
      state({
        limits: [
          { kind: 'five_hour', utilization: 0.94, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
        ],
      }),
    )
    expect(rows[0]).toMatchObject({ label: '5-hour', percent: 94, warn: true })
  })

  it('says so plainly when the account is running on overage', () => {
    const rows = usageRows(
      state({
        limits: [
          { kind: 'seven_day', utilization: 1, resetsAtMs: 1787173200000, overage: true, status: 'allowed' },
        ],
      }),
    )
    expect(rows[0]?.hint).toBe('on overage')
    expect(rows[0]?.warn).toBe(true)
  })

  it('shows how much of the context window this chat has taken', () => {
    const rows = usageRows(state({ context: { used: 40_000, window: 200_000 } }))
    expect(rows[0]).toMatchObject({ key: 'context', label: 'This chat', percent: 20, warn: false })
  })

  it('warns when the chat is close to being compacted', () => {
    const rows = usageRows(state({ context: { used: 180_000, window: 200_000 } }))
    expect(rows[0]).toMatchObject({ percent: 90, warn: true, hint: 'compacting soon' })
  })

  it('holds back the chat row entirely while nothing has been used', () => {
    expect(usageRows(state({ context: { used: 0, window: 200_000 } }))).toEqual([])
  })

  it('puts the account limits above the chat, because they outlast it', () => {
    const rows = usageRows(
      state({
        context: { used: 40_000, window: 200_000 },
        limits: [
          { kind: 'seven_day', utilization: 0.5, resetsAtMs: 1787173200000, overage: false, status: 'allowed' },
        ],
      }),
    )
    expect(rows.map((row) => row.key)).toEqual(['seven_day', 'context'])
  })
})

describe('spendLine: what this chat has cost', () => {
  it('stays quiet until something has been spent', () => {
    expect(spendLine(EMPTY)).toBeNull()
  })

  it('counts a single turn in the singular', () => {
    expect(spendLine(state({ cost: { ...EMPTY.cost, usd: 0.42, turns: 1 } }))).toBe('$0.42 over 1 turn')
  })

  it('reads the money and the turns together', () => {
    expect(spendLine(state({ cost: { ...EMPTY.cost, usd: 1.5, turns: 12 } }))).toBe('$1.50 over 12 turns')
  })
})

describe('waitingLine: why the panel is empty', () => {
  it('says the numbers come with a chat when none is running', () => {
    expect(waitingLine(EMPTY, false)).toContain('once a chat is under way')
  })

  it('says it is counting once a chat is running but nothing has landed', () => {
    expect(waitingLine(EMPTY, true)).toContain('first reply')
  })

  it('steps aside as soon as there is a real number to show', () => {
    const known = state({ context: { used: 40_000, window: 200_000 } })
    expect(waitingLine(known, true)).toBeNull()
  })

  it('steps aside when the money is known even if no level is', () => {
    expect(waitingLine(state({ cost: { ...EMPTY.cost, usd: 0.4, turns: 2 } }), true)).toBeNull()
  })
})

describe('usageRows: limits read straight from what the CLI printed', () => {
  it('shows the reset in the words the CLI used', () => {
    const rows = usageRows(
      state({
        limits: [
          { kind: 'five_hour', utilization: 0.69, resetsAtMs: 0, resetsText: 'Aug 15 at 2am', overage: false, status: 'allowed' },
        ],
      }),
    )
    expect(rows[0]).toMatchObject({ label: '5-hour', percent: 69, hint: 'resets Aug 15 at 2am' })
  })

  it('names a weekly limit that is tied to one model', () => {
    const rows = usageRows(
      state({
        limits: [
          { kind: 'seven_day_fable', utilization: 0.44, resetsAtMs: 0, resetsText: 'Aug 20 at 6am', overage: false, status: 'allowed' },
        ],
      }),
    )
    expect(rows[0]?.label).toBe('Weekly Fable')
  })

  it('warns on a nearly spent limit even when nobody called it a warning', () => {
    const rows = usageRows(
      state({
        limits: [
          { kind: 'seven_day', utilization: 0.92, resetsAtMs: 0, resetsText: 'Aug 20', overage: false, status: 'allowed' },
        ],
      }),
    )
    expect(rows[0]?.warn).toBe(true)
  })

  it('says so rather than inventing a time when no reset was reported', () => {
    const rows = usageRows(
      state({
        limits: [{ kind: 'five_hour', utilization: 0.1, resetsAtMs: 0, overage: false, status: 'allowed' }],
      }),
    )
    expect(rows[0]?.hint).toBe('reset time not reported')
  })
})


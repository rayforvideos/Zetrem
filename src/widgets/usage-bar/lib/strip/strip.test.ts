import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { chatLine, marksOfStatus, quietLine, spendLine } from './strip'

const EMPTY: StatusState = {
  usage: 'read',
  usageAtMs: null,
  probed: false,
  session: null,
  context: { used: 0, window: null },
  limits: [],
  cost: {
    usd: 0,
    turns: 0,
    lastTurnUsd: 0,
    durationMs: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 }
  },
  update: null,
  activity: 'idle'
}

function state(overrides: Partial<StatusState> = {}): StatusState {
  return { ...EMPTY, ...overrides }
}

function limit(kind: string, overrides: Partial<StatusState['limits'][number]> = {}) {
  return { kind, utilization: 0.1, resetsAtMs: 0, overage: false, status: 'allowed', ...overrides }
}

describe('marksOfStatus: every account limit, as a share used', () => {
  it('says nothing before any reading has arrived', () => {
    expect(marksOfStatus(EMPTY)).toEqual([])
  })

  it('rounds a share to a whole percent', () => {
    const [mark] = marksOfStatus(state({ limits: [limit('seven_day', { utilization: 0.604 })] }))
    expect(mark!.percent).toBe(60)
  })

  it('says nothing for the plain limits and names the one tied to a model', () => {
    const [plain] = marksOfStatus(state({ limits: [limit('seven_day')] }))
    const [fable] = marksOfStatus(state({ limits: [limit('seven_day_fable')] }))
    const [session] = marksOfStatus(state({ limits: [limit('five_hour')] }))
    expect(plain!.label).toBe('')
    expect(session!.label).toBe('')
    expect(fable!.label).toBe('Fable')
  })

  it('speaks up for a limit that is warning, whatever its share', () => {
    const [mark] = marksOfStatus(
      state({ limits: [limit('five_hour', { utilization: 0.1, status: 'allowed_warning' })] }),
    )
    expect(mark!.warn).toBe(true)
  })

  it('speaks up for a limit already into overage, which a low share would hide', () => {
    const [mark] = marksOfStatus(state({ limits: [limit('seven_day', { overage: true })] }))
    expect(mark!.warn).toBe(true)
    expect(mark!.hint).toContain('on overage')
  })

  it('speaks up once a limit is nearly full, before anyone else has to', () => {
    const [mark] = marksOfStatus(state({ limits: [limit('five_hour', { utilization: 0.86 })] }))
    expect(mark!.warn).toBe(true)
  })

  it('admits when it was told no reset time, rather than inventing one', () => {
    expect(marksOfStatus(state({ limits: [limit('five_hour')] }))[0]!.hint).toContain('not reported')
  })
})

describe('chatLine: what this chat is using of its window', () => {
  it('says nothing before the chat has used anything', () => {
    expect(chatLine(EMPTY)).toBeNull()
  })

  it('gives a share when the window size is known', () => {
    expect(chatLine(state({ context: { used: 50_000, window: 200_000 } }))).toBe('this chat 25%')
  })

  it('falls back to a count when the window size was never reported', () => {
    expect(chatLine(state({ context: { used: 40_000, window: null } }))).toBe('this chat 40.0k')
  })
})

describe('spendLine: what this session has cost', () => {
  it('says nothing until something has been spent', () => {
    expect(spendLine(EMPTY)).toBeNull()
  })

  it('gives the running total to the cent', () => {
    expect(spendLine(state({ cost: { ...EMPTY.cost, usd: 0.6177 } }))).toBe('$0.62')
  })
})

describe('quietLine: what to say while there is nothing to show', () => {
  it('says it is reading before the account has answered', () => {
    expect(quietLine(state({ usage: 'unread' }))).toBe('Reading usage…')
  })

  it('says plainly that there are none once the account has answered with none', () => {
    expect(quietLine(state({ usage: 'read' }))).toBe('No account limits reported')
  })

  it('does not mistake having read nothing for having nothing to read', () => {
    expect(quietLine(state({ usage: 'unread' }))).not.toBe(quietLine(state({ usage: 'read' })))
  })

  it('stops explaining the moment there is a reading to show', () => {
    expect(quietLine(state({ usage: 'read', limits: [limit('five_hour')] }))).toBeNull()
  })

  it('stops explaining for a chat reading alone, even with no account limits', () => {
    expect(quietLine(state({ usage: 'read', context: { used: 10, window: 100 } }))).toBeNull()
  })
})

describe('a reset that has already come round', () => {
  it('says nothing about time left rather than counting a moment that has passed', () => {
    const now = 1_700_000_000_000
    const [mark] = marksOfStatus(
      state({ limits: [limit('five_hour', { resetsAtMs: now - 60_000, utilization: 0.51 })] }),
      now,
    )
    expect(mark!.left).toBeNull()
    expect(mark!.percent).toBe(51)
  })
})

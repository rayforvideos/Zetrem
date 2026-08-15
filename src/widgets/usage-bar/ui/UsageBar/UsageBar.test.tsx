import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { UsageBar } from './UsageBar'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    usage: 'read',
    session: null,
    context: { used: 100_000, window: 1_000_000 },
    cost: {
      usd: 0.19,
      lastTurnUsd: 0.04,
      tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
      durationMs: 10485,
      ttftMs: 2352,
      turns: 3,
    },
    limits: [],
    hooks: [],
    update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
    activity: 'idle',
    ...overrides,
  }
}

function html(status: StatusState, open = false): string {
  return renderToStaticMarkup(<UsageBar status={status} open={open} onToggle={() => {}} />)
}

describe('UsageBar: one strip at the foot of the window', () => {
  it('carries the session facts that used to sit in their own row', () => {
    expect(html(state())).toContain('2.1.231')
  })

  it('says nothing about what it does not know', () => {
    const bare = state({
      context: { used: 0, window: null },
      cost: { ...state().cost, usd: 0 },
      update: null,
    })
    const out = html(bare)
    expect(out).not.toContain('Context')
    expect(out).not.toContain('CLI')
  })

  it('marks a warning by weight and not by colour', () => {
    const warned = state({ context: { used: 880_000, window: 1_000_000 } })
    const out = html(warned)
    expect(out).toContain('compacting soon')
    expect(out).not.toMatch(/text-(red|amber|yellow|orange)-/)
  })

  it('sets numbers in tabular figures, so nothing shifts as they change', () => {
    expect(html(state())).toContain('tabular-nums')
  })

  it('has one handle for the drawer, and it says which way it goes', () => {
    expect(html(state())).toContain('aria-expanded="false"')
    expect(html(state(), true)).toContain('aria-expanded="true"')
  })

  it('shows a limit it was told about', () => {
    const limited = state({
      limits: [
        {
          kind: 'five-hour',
          utilization: 0.26,
          status: 'allowed',
          resetsAtMs: 0,
          overage: false,
        } as StatusState['limits'][number],
      ],
    })
    expect(html(limited)).toContain('26%')
  })
})

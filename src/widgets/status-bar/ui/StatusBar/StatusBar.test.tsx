import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { StatusBar } from './StatusBar'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    session: null,
    context: { used: 100_000, window: 1_000_000 },
    cost: { usd: 0.19, lastTurnUsd: 0.04, tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 }, durationMs: 10485, ttftMs: 2352, turns: 3 },
    limits: [],
    hooks: [],
    update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
    activity: 'idle',
    ...overrides,
  }
}

describe('StatusBar', () => {
  it('makes a cell only for what it knows', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open={false} onToggle={() => {}} />)
    expect(html).toContain('2.1.231')
  })

  it('leaves only the handle when it knows nothing, so an empty row takes no space', () => {
    const empty = state({ context: { used: 0, window: null }, cost: { ...state().cost, usd: 0 }, update: null })
    const html = renderToStaticMarkup(<StatusBar status={empty} open={false} onToggle={() => {}} />)
    expect(html).not.toContain('Context')
    expect(html).toContain('aria-expanded="false"')
  })

  it('sets numbers in tabular figures, so nothing shifts as they change', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open={false} onToggle={() => {}} />)
    expect(html).toContain('tabular-nums')
  })

  it('marks a warning by weight and not by colour', () => {
    const warned = state({ context: { used: 880_000, window: 1_000_000 } })
    const html = renderToStaticMarkup(<StatusBar status={warned} open={false} onToggle={() => {}} />)
    expect(html).toContain('compacting soon')
    expect(html).not.toMatch(/text-(red|amber|yellow|orange)-/)
  })

  it('has the handle say when the drawer is open', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open onToggle={() => {}} />)
    expect(html).toContain('aria-expanded="true"')
  })
})

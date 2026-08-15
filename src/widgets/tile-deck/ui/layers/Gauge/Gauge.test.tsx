import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { Gauge } from './Gauge'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'subagent',
    label: 'Explore',
    subagentType: 'Explore',
    model: 'subagent',
    status: 'working',
    headline: '',
    stream: [],
    transcript: [],
    tokens: 198_000,
    contextUsed: 0.87,
    startedAtMs: 0,
    ...overrides,
  }
}

function draw(overrides: Partial<AgentSession> = {}): string {
  return renderToStaticMarkup(<Gauge session={session(overrides)} nowMs={12_000} />)
}

describe('Gauge: what the work has cost, and how long it has taken', () => {
  it('puts the spend on one side and the clock on the other', () => {
    const html = draw()
    expect(html).toContain('198.0k')
    expect(html).toContain('0:12')
  })

  it('sheds the later figures in a narrow tile rather than cutting a word in half', () => {
    expect(draw()).toContain('@max-[220px]:hidden')
  })

  it('never lets the first figure be the one that goes', () => {
    const html = draw()
    const tokensAt = html.indexOf('198.0k')
    const hiddenAt = html.indexOf('@max-[220px]:hidden')
    expect(hiddenAt).toBeGreaterThan(tokensAt)
    expect(html.slice(hiddenAt)).toContain('87')
  })

  it('measures itself, so what it sheds follows the tile and not the window', () => {
    expect(draw()).toContain('container-type:inline-size')
  })

  it('holds the clock at full strength while the work is still running', () => {
    expect(draw()).toContain('data-clock="running"')
    expect(draw({ status: 'done' })).toContain('data-clock="settled"')
  })
})

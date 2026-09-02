import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { Helpers } from './Helpers'

function helper(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `일 ${id}`,
    subagentType: 'Explore',
    model: 'demo-1',
    status: 'working',
    headline: `${id}를 살펴보는 중`,
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    parentId: 'boss',
    ...overrides,
  }
}

function draw(sessions: AgentSession[]): string {
  return renderToStaticMarkup(<Helpers helpers={sessions} />)
}

function marks(html: string): string[] {
  return [...html.matchAll(/data-helper="([^"]+)"/g)].map((hit) => hit[1] as string)
}

describe('Helpers: the teammates a teammate called in', () => {
  it('draws nothing when nobody was called in', () => {
    expect(draw([])).toBe('')
  })

  it('gives each helper a folded row, oldest first', () => {
    const html = draw([helper('late', { startedAtMs: 900 }), helper('early', { startedAtMs: 100 })])
    expect(marks(html)).toEqual(['early', 'late'])
    expect(html).toContain('Their helpers')
    expect(html).toContain('early를 살펴보는 중')
  })

  it('shows four and counts the rest, so one tile never fills with helpers', () => {
    const html = draw([1, 2, 3, 4, 5].map((n) => helper(`h${n}`, { startedAtMs: n })))
    expect(marks(html)).toHaveLength(4)
    expect(html).toContain('data-more')
    expect(html).toContain('+1')
  })

  it('tells a helper still working apart from one that has reported', () => {
    const html = draw([helper('a'), helper('b', { status: 'reported', startedAtMs: 5 })])
    expect(html).toContain('zt-breath')
    expect(html).toContain('✓')
  })
})

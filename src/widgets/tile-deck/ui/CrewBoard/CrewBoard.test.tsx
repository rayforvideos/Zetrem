import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { CrewBoard } from './CrewBoard'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    label: 'explore',
    subagentType: 'explore',
    model: 'opus',
    status: 'working',
    headline: 'maps the tree',
    outcome: '',
    doing: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 1000,
    ...overrides,
  } as AgentSession
}

const RECT = { x: 0, y: 0, w: 400, h: 800 }
const NOW = 61_000

function html(sessions: AgentSession[], openId: string | null = null): string {
  return renderToStaticMarkup(
    <CrewBoard sessions={sessions} rect={RECT} nowMs={NOW} openId={openId} onOpen={() => {}} />,
  )
}

describe('CrewBoard: one line for each of them', () => {
  it('draws a lane for every hire, in the order they were sent out', () => {
    const out = html([session({ id: 'a' }), session({ id: 'b' }), session({ id: 'c' })])
    expect(out.indexOf('data-lane="a"')).toBeLessThan(out.indexOf('data-lane="b"'))
    expect(out.indexOf('data-lane="b"')).toBeLessThan(out.indexOf('data-lane="c"'))
  })

  it('counts the room at the top', () => {
    expect(html([session(), session({ id: 'b', status: 'waiting' })])).toContain(
      'Your crew · 1 working · 1 waiting on you',
    )
  })

  it('says what each of them is on', () => {
    const out = html([
      session({
        stream: [
          { id: 'c1', line: 'Read src/app.ts', startedAtMs: 2000, endedAtMs: null, failed: false, note: '' },
        ],
      }),
    ])
    expect(out).toContain('Reading')
    expect(out).toContain('app.ts')
  })

  it('opens one lane and only that one', () => {
    const out = html([session({ id: 'a' }), session({ id: 'b' })], 'b')
    expect(out).toContain('data-lane="b" data-open="true"')
    expect(out).not.toContain('data-lane="a" data-open')
    expect((out.match(/data-lane-open/g) ?? []).length).toBe(1)
  })

  it('marks how far each one has run, so a long wait shows without a number being read', () => {
    const out = html([session()])
    expect(out).toMatch(/width:\s*\d+%/)
  })

  it('leaves the reach off someone who is no longer running', () => {
    expect(html([session({ status: 'reported' })])).toContain('width:0%')
  })
})

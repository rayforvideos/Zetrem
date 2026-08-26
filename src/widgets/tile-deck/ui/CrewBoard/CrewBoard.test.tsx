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
    <CrewBoard
      sessions={sessions}
      face="onigiri"
      name="Ray"
      rect={RECT}
      nowMs={NOW}
      openId={openId}
      onOpen={() => {}}
    />,
  )
}

const many = (n: number) => Array.from({ length: n }, (_, i) => session({ id: `s${i}` }))

describe('CrewBoard: a card for each of them', () => {
  it('draws a card for every hire, in the order they were sent out', () => {
    const out = html([session({ id: 'a' }), session({ id: 'b' }), session({ id: 'c' })])
    expect(out.indexOf('data-card="a"')).toBeLessThan(out.indexOf('data-card="b"'))
    expect(out.indexOf('data-card="b"')).toBeLessThan(out.indexOf('data-card="c"'))
  })

  it('hangs the crew off you, so the board reads as a chart and not a list', () => {
    expect(html([session()])).toContain('Ray')
  })

  it('turns the cards into lanes once there are ten', () => {
    const out = html(many(10))
    expect(out).toContain('data-lane="s0"')
    expect(out).not.toContain('data-card="s0"')
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
          {
            id: 'c1',
            line: 'Read src/app.ts',
            startedAtMs: 2000,
            endedAtMs: null,
            failed: false,
            note: '',
          },
        ],
      }),
    ])
    expect(out).toContain('Reading')
    expect(out).toContain('app.ts')
  })

  it('opens one card and only that one, and shows its run below', () => {
    const out = html([session({ id: 'a' }), session({ id: 'b' })], 'b')
    expect(out).toContain('data-card="b" data-open="true"')
    expect(out).not.toContain('data-card="a" data-open')
    expect((out.match(/data-crew-detail/g) ?? []).length).toBe(1)
  })

  it('opens one lane and only that one when the crew is crowded', () => {
    const out = html(many(10), 's3')
    expect(out).toContain('data-lane="s3" data-open="true"')
    expect((out.match(/data-lane-open/g) ?? []).length).toBe(1)
  })

  it('gives the eye to one waiting card, not to all of them', () => {
    const out = html([
      session({ id: 'a', status: 'waiting', waitingSinceMs: 10 }),
      session({ id: 'b', status: 'waiting', waitingSinceMs: 900 }),
    ])
    expect((out.match(/data-waiting/g) ?? []).length).toBe(2)
    expect((out.match(/data-eye/g) ?? []).length).toBe(1)
  })

  it('marks how far each one has run, so a long wait shows without a number being read', () => {
    const out = html([session()])
    expect(out).toMatch(/width:\s*\d+%/)
  })

  it('leaves the reach off someone who is no longer running', () => {
    expect(html([session({ status: 'reported' })])).toContain('width:0%')
  })
})

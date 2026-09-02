import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { CrewBoard } from './CrewBoard'

// A Write call with a diff attached, so a rendered detail pane can be checked
// for the change it drew.
const WRITE_CALL = {
  id: 'c1',
  line: 'Write one.ts',
  startedAtMs: 0,
  endedAtMs: 200,
  failed: false,
  note: '',
  change: [[{ kind: 'add' as const, text: 'const x = 1' }]],
  count: { added: 1, removed: 0 },
}

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

function html(
  sessions: AgentSession[],
  openId: string | null = null,
  helpers?: Map<string, AgentSession[]>,
): string {
  return renderToStaticMarkup(
    <CrewBoard
      sessions={sessions}
      helpers={helpers}
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

  it('shows the open card as a timeline with its change and its helpers, not the old transcript', () => {
    const out = html(
      [session({ id: 'a' }), session({ id: 'b', stream: [WRITE_CALL] }), session({ id: 'c' })],
      'b',
      new Map([['b', [session({ id: 'helper-1', label: 'reviewer' })]]]),
    )
    const detailAt = out.indexOf('data-crew-detail')
    const detail = out.slice(detailAt)
    expect(detailAt).toBeGreaterThanOrEqual(0)
    expect(detail).toContain('data-change')
    expect(detail).toContain('data-helper="helper-1"')
  })

  it('shows the open lane as a timeline with its change and its helpers when the crew is crowded', () => {
    const crowd = many(10).map((one) => (one.id === 's3' ? { ...one, stream: [WRITE_CALL] } : one))
    const out = html(crowd, 's3', new Map([['s3', [session({ id: 'helper-2' })]]]))
    const laneOpenAt = out.indexOf('data-lane-open')
    const laneOpen = out.slice(laneOpenAt)
    expect(laneOpenAt).toBeGreaterThanOrEqual(0)
    expect(laneOpen).toContain('data-change')
    expect(laneOpen).toContain('data-helper="helper-2"')
  })

  it('leaves a closed lane exactly as before: no timeline, no helpers, just the row', () => {
    const crowd = many(10)
    const out = html(crowd, 's3', undefined)
    const closedLane = out.slice(out.indexOf('data-lane="s0"'), out.indexOf('data-lane="s1"'))
    expect(closedLane).not.toContain('data-lane-open')
    expect(closedLane).not.toContain('data-helpers')
  })
})

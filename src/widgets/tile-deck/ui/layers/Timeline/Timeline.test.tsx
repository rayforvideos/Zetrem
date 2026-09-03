import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession, Call, TranscriptEntry } from '@/entities/agent-session'
import { Timeline } from './Timeline'

function said(role: TranscriptEntry['role'], text: string, atMs: number): TranscriptEntry {
  return { role, text, atMs }
}

function call(id: string, line: string, overrides: Partial<Call> = {}): Call {
  return { id, line, startedAtMs: 0, endedAtMs: 200, failed: false, note: '', ...overrides }
}

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    runnerId: 'fake',
    label: '가짜 에이전트',
    subagentType: 'general-purpose',
    model: 'demo-1',
    status: 'working',
    headline: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

function draw(s: AgentSession): string {
  return renderToStaticMarkup(<Timeline session={s} />)
}

describe('Timeline: the said and the done, in the order they happened', () => {
  it('lays out an assignment, a call with a change, and a later reply in time order', () => {
    const html = draw(
      session({
        transcript: [said('user', '이 파일을 고쳐줘', 100), said('assistant', '다 고쳤어요', 500)],
        stream: [
          call('c1', 'Write one.ts', {
            startedAtMs: 200,
            endedAtMs: 300,
            change: [[{ kind: 'add', text: 'const x = 1' }]],
            count: { added: 1, removed: 0 },
          }),
        ],
      }),
    )
    const saidAt = html.indexOf('data-said')
    const callAt = html.indexOf('data-call')
    const changeAt = html.indexOf('data-change')
    const secondSaidAt = html.indexOf('다 고쳤어요')
    expect(saidAt).toBeGreaterThanOrEqual(0)
    expect(callAt).toBeGreaterThan(saidAt)
    expect(changeAt).toBeGreaterThan(callAt)
    expect(secondSaidAt).toBeGreaterThan(changeAt)
    expect(html).toContain('이 파일을 고쳐줘')
    expect(html).toContain('one.ts')
  })

  it('leaves out a call that read instead of wrote, which the log under it lists', () => {
    const html = draw(session({ stream: [call('c1', 'Read one.ts')] }))
    expect(html).not.toContain('data-call')
    expect(html).not.toContain('data-change')
  })

  it('leaves out a call that failed, for the same reason', () => {
    const html = draw(session({ stream: [call('c1', 'Bash npx tsc', { failed: true })] }))
    expect(html).not.toContain('data-call')
  })

  it('keeps the call a change sits under, as the caption of its diff', () => {
    const html = draw(
      session({
        stream: [
          call('c1', 'Read one.ts'),
          call('c2', 'Edit one.ts', { change: [[{ kind: 'add', text: 'x' }]] }),
        ],
      }),
    )
    expect(html.match(/data-call/g)).toHaveLength(1)
    expect(html).toContain('data-change')
  })

  it('draws nothing for a session with nothing said and nothing done', () => {
    expect(draw(session())).not.toContain('data-said')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { CallStream } from './CallStream'

function call(id: string, line: string, overrides: Partial<Call> = {}): Call {
  return { id, line, startedAtMs: 0, endedAtMs: 200, failed: false, note: '', ...overrides }
}

function draw(calls: Call[]): string {
  return renderToStaticMarkup(<CallStream calls={calls} />)
}

describe('CallStream: everything the teammate reached for', () => {
  it('says so when nothing has been done yet', () => {
    const html = draw([])
    expect(html).toContain('What they did')
    expect(html).toContain('Nothing yet')
  })

  it('leaves a line for each call, with what came back', () => {
    const html = draw([call('c1', 'Read a.ts', { note: '38 lines' })])
    expect(html).toContain('Read a.ts')
    expect(html).toContain('38 lines')
    expect(html).not.toContain('data-change')
  })

  it('marks a call that failed', () => {
    expect(draw([call('c1', 'Bash npx tsc', { failed: true })])).toContain('failed')
  })

  it('lays every edit out whole, not only the last one', () => {
    const html = draw([
      call('c1', 'Edit a.ts', { change: [[{ kind: 'add', text: '첫 줄' }]] }),
      call('c2', 'Read b.ts'),
      call('c3', 'Edit c.ts', { change: [[{ kind: 'add', text: '둘째 줄' }]] }),
    ])
    expect(html.split('data-change').length - 1).toBe(2)
    expect(html).toContain('첫 줄')
    expect(html).toContain('둘째 줄')
  })

  it('gives a diff one scroll box, not a box inside a box', () => {
    const html = draw([call('c1', 'Edit a.ts', { change: [[{ kind: 'add', text: '첫 줄' }]] })])
    expect(html.match(/overflow-auto/g)).toHaveLength(1)
  })
})

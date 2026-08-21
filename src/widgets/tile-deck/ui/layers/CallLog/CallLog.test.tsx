import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { CallLog } from './CallLog'

function call(id: string, line: string, overrides: Partial<Call> = {}): Call {
  return { id, line, startedAtMs: 0, endedAtMs: 200, failed: false, note: '', ...overrides }
}

function draw(calls: Call[], live = true): string {
  return renderToStaticMarkup(<CallLog calls={calls} live={live} nowMs={47_000} />)
}

describe('CallLog: every tool the agent reached for, and what came back', () => {
  it('draws nothing before the agent has done anything', () => {
    expect(draw([])).toBe('')
  })

  it('keeps every call, so nothing scrolls away for good', () => {
    const html = draw([call('a', 'Read one.ts'), call('b', 'Grep foo'), call('c', 'Bash npm test')])
    expect(html).toContain('one.ts')
    expect(html).toContain('foo')
    expect(html).toContain('npm test')
  })

  it('says what each call was for and what it gave back', () => {
    const html = draw([call('a', 'Read one.ts', { note: '38 lines' })], false)
    expect(html).toContain('Reading')
    expect(html).toContain('one.ts')
    expect(html).toContain('38 lines')
  })

  it('marks a call that failed instead of leaving it looking done', () => {
    expect(draw([call('a', 'Bash npx tsc', { failed: true })], false)).toContain('data-call="failed"')
  })

  it('fills a slow call further across its row than a quick one', () => {
    const html = draw([call('a', 'Read x', { endedAtMs: 20 }), call('b', 'Bash npm test', { endedAtMs: 30_000 })], false)
    const widths = [...html.matchAll(/width:([\d.]+)%/g)].map((hit) => Number(hit[1]))
    expect(widths[1]!).toBeGreaterThan(widths[0]!)
  })

  it('gives the call in hand the stage, and the ones behind it a line each', () => {
    const running = call('now', 'Bash npm test', { endedAtMs: null })
    const html = draw([call('a', 'Read x'), running])
    expect(html).toContain('data-now-stage')
    expect(html.match(/data-call=/g)).toHaveLength(1)
  })

  it('takes the stage away once the agent has stopped, since nothing is in hand', () => {
    const running = call('now', 'Bash npm test', { endedAtMs: null })
    expect(draw([running], false)).not.toContain('data-now-stage')
  })

  it('counts the call in hand against the clock, so a long wait shows as one', () => {
    const running = call('now', 'Bash npm test', { startedAtMs: 2000, endedAtMs: null })
    expect(draw([running])).toContain('0:45')
  })
})

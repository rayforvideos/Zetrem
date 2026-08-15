import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Mark } from '../work-trace/work-trace.types'
import { WorkTrace } from './WorkTrace'

function mark(line: string, overrides: Partial<Mark> = {}): Mark {
  return { line, ms: 200, failed: false, running: false, ...overrides }
}

function draw(marks: Mark[]): string {
  return renderToStaticMarkup(<WorkTrace marks={marks} />)
}

describe('WorkTrace: the shape of the work, as a strip', () => {
  it('draws nothing at all before any work has happened', () => {
    expect(draw([])).toBe('')
  })

  it('draws one mark per call', () => {
    const html = draw([mark('Read a.ts'), mark('Read b.ts'), mark('Bash npm test')])
    expect(html.match(/data-bar=/g)).toHaveLength(3)
  })

  it('drops a failed call below the line, so a bad run reads without colour', () => {
    expect(draw([mark('Bash exit 1', { failed: true })])).toContain('data-bar="failed"')
    expect(draw([mark('Bash exit 1', { failed: true })])).toContain('margin-bottom:-4px')
  })

  it('marks the call still in flight, so the eye lands on now', () => {
    expect(draw([mark('Bash sleep 30', { running: true })])).toContain('data-bar="running"')
  })

  it('makes a slow call visibly wider than a quick one', () => {
    const html = draw([mark('Read a.ts', { ms: 20 }), mark('Bash npm test', { ms: 30_000 })])
    const widths = [...html.matchAll(/width:(\d+)px/g)].map((hit) => Number(hit[1]))
    expect(widths[1]! - widths[0]!).toBeGreaterThanOrEqual(8)
  })

  it('keeps itself out of the reading order, being a picture of the log beside it', () => {
    expect(draw([mark('Read a.ts')])).toContain('aria-hidden')
  })
})

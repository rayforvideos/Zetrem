import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { ToolRun } from './ToolRun'

function tool(line: string, overrides: Partial<ToolActivity> = {}): ToolActivity {
  return {
    line,
    toolUseId: line,
    input: null,
    result: null,
    startedAtMs: 0,
    endedAtMs: 200,
    ...overrides,
  }
}

function draw(tools: ToolActivity[]): string {
  return renderToStaticMarkup(
    <ToolRun tools={tools} live={false} nowMs={1000} project="/work/app" />,
  )
}

function many(count: number): ToolActivity[] {
  return Array.from({ length: count }, (_, at) => tool(`Read ${at}.ts`))
}

function broke(line: string, stdout: string): ToolActivity {
  return tool(line, { result: { stdout, stderr: '', isError: true, interrupted: false } })
}

describe('ToolRun: a long stretch of tool work, folded', () => {
  it('shows a short stretch whole, with nothing to unfold', () => {
    const html = draw([tool('Read a.ts'), tool('Bash npm test')])
    expect(html).not.toContain('data-run=')
    expect(html).toContain('a.ts')
  })

  it('folds a long stretch behind one line that says what it was', () => {
    const html = draw([...many(20), tool('Bash npm test')])
    expect(html).toContain('data-run="17"')
    expect(html).toContain('17 files read')
  })

  it('keeps the newest steps in view even while the rest is folded', () => {
    expect(draw(many(20))).toContain('Read 19.ts')
  })

  it('leaves the fold shut until it is asked to open', () => {
    const html = draw(many(20))
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('Read 0.ts')
  })

  it('draws the folded work as a strip, so the fold is not a blank', () => {
    expect(draw(many(20))).toContain('data-trace')
  })
})

describe('a fold does not fold a failure away', () => {
  const run = [
    broke('Read a.ts', 'File does not exist.'),
    broke('Read b.ts', 'File does not exist.'),
    ...many(4),
  ]

  it('says the reads failed rather than counting them as done', () => {
    const html = draw(run)
    expect(html).toContain('2 files read, all failed')
  })

  it('counts what did fail when only some of the fold did', () => {
    const html = draw([broke('Read a.ts', 'File does not exist.'), ...many(5)])
    expect(html).toContain('2 files read, 1 failed')
  })

  it('lies open on arrival, so the failure is on screen and not behind a chevron', () => {
    const html = draw(run)
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('a.ts')
  })

  it('lets the failed row inside the fold open itself and show what went wrong', () => {
    expect(draw(run)).toContain('File does not exist.')
  })

  it('leaves a fold with nothing wrong in it shut', () => {
    expect(draw(many(20))).toContain('aria-expanded="false"')
  })
})

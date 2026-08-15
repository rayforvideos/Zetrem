import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { NowStage } from './NowStage'

function call(line: string, overrides: Partial<Call> = {}): Call {
  return { id: 'c1', line, startedAtMs: 0, endedAtMs: null, failed: false, note: '', ...overrides }
}

function draw(line: string, live = true): string {
  return renderToStaticMarkup(<NowStage call={call(line)} live={live} />)
}

describe('NowStage: the act the agent is in the middle of', () => {
  it('gives each kind of act its own picture', () => {
    expect(draw('Read a.ts')).toContain('data-now-stage="read"')
    expect(draw('Edit a.ts')).toContain('data-now-stage="write"')
    expect(draw('Bash npm test')).toContain('data-now-stage="run"')
    expect(draw('Grep useAgent')).toContain('data-now-stage="search"')
    expect(draw('WebFetch https://anthropic.com')).toContain('data-now-stage="web"')
  })

  it('names the act and what it is being done to', () => {
    const html = draw('Bash npm test')
    expect(html).toContain('Running')
    expect(html).toContain('npm test')
  })

  it('shows the file itself, not the path it sits under', () => {
    expect(draw('Read src/widgets/tile-deck/AgentTile.tsx')).toContain('AgentTile.tsx')
  })

  it('moves only while the agent is still at it', () => {
    expect(draw('Read a.ts', true)).toContain('animation')
    expect(draw('Read a.ts', false)).not.toContain('animation')
  })

  it('dims the picture once the act is over, so a still frame does not read as live', () => {
    expect(draw('Read a.ts', false)).toContain('opacity:0.4')
  })

  it('falls back to a picture it always has for an act it cannot draw', () => {
    expect(draw('TodoWrite')).toContain('data-now-stage="think"')
  })

  it('keeps a line it could not read exactly as it came, rather than half of it', () => {
    expect(draw('무언가 이상한 줄 하나')).toContain('무언가 이상한 줄 하나')
  })

  it('reads a bare tool name from progress, which carries no target at all', () => {
    expect(draw('Read')).toContain('data-now-stage="read"')
    expect(draw('Read')).toContain('Reading')
    expect(draw('Bash')).toContain('Running')
  })
})

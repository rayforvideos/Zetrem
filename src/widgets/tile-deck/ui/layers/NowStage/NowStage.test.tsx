import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { NowStage } from './NowStage'
import { LONG_CALL_MS } from '../../../lib/long-call/long-call'

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

function running(line: string, nowMs: number): string {
  return renderToStaticMarkup(<NowStage call={call(line)} live nowMs={nowMs} />)
}

describe('a call that keeps running says so, rather than leaving a clock to be watched', () => {
  it('shows the plain clock while the call is still an ordinary one', () => {
    const html = running('Bash npm run dev', 30_000)
    expect(html).toContain('data-elapsed')
    expect(html).not.toContain('data-still-running')
  })

  it('puts up a chip once the call has run for minutes', () => {
    const html = running('Bash npm run dev', LONG_CALL_MS)
    expect(html).toContain('data-still-running')
    expect(html).toContain('still running')
    expect(html).toContain('3m')
  })

  it('counts on in whole minutes, so the chip settles between them', () => {
    expect(running('Bash npm run dev', 12 * 60_000)).toContain('12m')
    expect(running('Bash npm run dev', 12 * 60_000 + 30_000)).toContain('12m')
  })

  it('drops the clock rather than saying the same thing twice', () => {
    expect(running('Bash npm run dev', LONG_CALL_MS)).not.toContain('data-elapsed')
  })

  it('says nothing on a tile nobody is running, however old the call looks', () => {
    const html = renderToStaticMarkup(
      <NowStage call={call('Bash npm run dev')} live={false} nowMs={LONG_CALL_MS * 10} />,
    )
    expect(html).not.toContain('data-still-running')
  })
})

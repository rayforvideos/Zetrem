import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { Headline } from './Headline'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'subagent',
    label: '의존성 점검원',
    subagentType: 'Explore',
    model: 'subagent',
    status: 'working',
    headline: '무엇을 보고 있는지',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('Headline: who this tile belongs to', () => {
  it('never lets the header be squeezed out of its own space', () => {
    const html = renderToStaticMarkup(<Headline session={session()} withText={false} />)
    expect(html).toContain('flex:0 0 auto')
    expect(html).not.toContain('min-height:0')
  })

  it('holds the name and face steady while the words below it take the squeeze', () => {
    const html = renderToStaticMarkup(<Headline session={session()} />)
    const header = html.slice(0, html.indexOf('무엇을 보고 있는지'))
    expect(header).toContain('flex:0 0 auto')
  })

  it('says who they are and what they were given', () => {
    const html = renderToStaticMarkup(<Headline session={session()} />)
    expect(html).toContain('의존성 점검원')
    expect(html).toContain('무엇을 보고 있는지')
  })

  it('drops the words when something else on the tile is already saying them', () => {
    const html = renderToStaticMarkup(<Headline session={session()} withText={false} />)
    expect(html).not.toContain('무엇을 보고 있는지')
  })
})

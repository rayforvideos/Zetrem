import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { HelperList } from './HelperList'

function helper(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'subagent',
    label: '스타일 점검',
    subagentType: 'Explore',
    model: 'subagent',
    status: 'reported',
    headline: '두 파일에서 같은 패턴을 찾았습니다',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    parentId: 's1',
    ...overrides,
  }
}

function draw(helpers: AgentSession[]): string {
  return renderToStaticMarkup(<HelperList helpers={helpers} />)
}

describe('HelperList: the subagents a teammate called in', () => {
  it('draws nothing for a teammate that worked alone', () => {
    expect(draw([])).toBe('')
  })

  it('names each helper, what it was for, and where it stands', () => {
    const html = draw([helper('g1')])
    expect(html).toContain('Their helpers')
    expect(html).toContain('data-helper="g1"')
    expect(html).toContain('Explore')
    expect(html).toContain('스타일 점검')
    expect(html).toContain('Reported back')
  })

  it('carries what a helper came back with, once it has reported', () => {
    expect(draw([helper('g1')])).toContain('두 파일에서 같은 패턴을 찾았습니다')
    expect(draw([helper('g1', { status: 'done' })])).toContain('두 파일에서 같은 패턴을 찾았습니다')
  })

  it('leaves out the prompt a working helper is still carrying as its headline', () => {
    const html = draw([
      helper('g1', { status: 'working', headline: 'You are working in the directory /Users/…' }),
    ])
    expect(html).toContain('스타일 점검')
    expect(html).not.toContain('You are working in the directory')
  })
})

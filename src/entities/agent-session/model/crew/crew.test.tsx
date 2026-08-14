import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AgentSprite } from '../../ui/AgentSprite/AgentSprite'
import { CrewProvider, useModel } from './crew'
import type { Crew } from './crew.types'

function faceOf(html: string): string {
  return html.match(/alt="([^"]+)"/)?.[1] ?? ''
}

function crew(members: Crew['members'], fallbackModel: string | null = null): Crew {
  return { members, fallbackModel }
}

function Model({ type }: { type: string }) {
  return <i>{useModel(type) ?? 'unknown'}</i>
}

describe('Crew — 얼굴', () => {
  it('명단에 적힌 얼굴을 어디서든 쓴다 — 고른 얼굴과 일하는 얼굴이 달라선 안 된다', () => {
    const bare = renderToStaticMarkup(<AgentSprite subagentType="code-reviewer" />)
    const known = renderToStaticMarkup(
      <CrewProvider crew={crew({ 'code-reviewer': { character: 'ghost', model: null } })}>
        <AgentSprite subagentType="code-reviewer" />
      </CrewProvider>,
    )
    expect(faceOf(known)).toBe('ghost')
    expect(faceOf(bare)).not.toBe('ghost')
  })

  it('직접 준 얼굴이 명단보다 앞선다', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({ 'code-reviewer': { character: 'ghost', model: null } })}>
        <AgentSprite subagentType="code-reviewer" chosen="planet" />
      </CrewProvider>,
    )
    expect(faceOf(html)).toBe('planet')
  })

  it('모르는 이름은 이름에서 얼굴을 만든다 — 빈 자리를 그리지 않는다', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({})}>
        <AgentSprite subagentType="whoever" />
      </CrewProvider>,
    )
    expect(faceOf(html).length).toBeGreaterThan(0)
  })
})

describe('Crew — 모델', () => {
  it('제 모델이 적혀 있으면 그것을 쓴다', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({ Explore: { character: null, model: 'sonnet' } }, 'claude-opus-5')}>
        <Model type="Explore" />
      </CrewProvider>,
    )
    expect(html).toContain('sonnet')
  })

  it('제 모델이 없으면 세션 모델을 물려받는다 — 실제로 그렇게 돈다', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({ Explore: { character: null, model: null } }, 'claude-opus-5')}>
        <Model type="Explore" />
      </CrewProvider>,
    )
    expect(html).toContain('claude-opus-5')
  })

  it('명단에 없는 사람의 모델은 지어내지 않는다', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({}, 'claude-opus-5')}>
        <Model type="Whoever" />
      </CrewProvider>,
    )
    expect(html).toContain('unknown')
  })
})

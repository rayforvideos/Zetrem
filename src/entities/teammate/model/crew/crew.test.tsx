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

describe('Crew: faces', () => {
  it('uses the face on the roster everywhere, so the one you chose is the one that works', () => {
    const bare = renderToStaticMarkup(<AgentSprite subagentType="code-reviewer" />)
    const known = renderToStaticMarkup(
      <CrewProvider crew={crew({ 'code-reviewer': { character: 'ghost', model: null } })}>
        <AgentSprite subagentType="code-reviewer" />
      </CrewProvider>,
    )
    expect(faceOf(known)).toBe('ghost')
    expect(faceOf(bare)).not.toBe('ghost')
  })

  it('lets a face given directly win over the roster', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({ 'code-reviewer': { character: 'ghost', model: null } })}>
        <AgentSprite subagentType="code-reviewer" chosen="planet" />
      </CrewProvider>,
    )
    expect(faceOf(html)).toBe('planet')
  })

  it('makes a face out of an unknown name, rather than drawing a gap', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({})}>
        <AgentSprite subagentType="whoever" />
      </CrewProvider>,
    )
    expect(faceOf(html).length).toBeGreaterThan(0)
  })
})

describe('Crew: models', () => {
  it('uses the model written for that person', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({ Explore: { character: null, model: 'sonnet' } }, 'claude-opus-5')}>
        <Model type="Explore" />
      </CrewProvider>,
    )
    expect(html).toContain('sonnet')
  })

  it('inherits the session model when there is none, which is how it really runs', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({ Explore: { character: null, model: null } }, 'claude-opus-5')}>
        <Model type="Explore" />
      </CrewProvider>,
    )
    expect(html).toContain('claude-opus-5')
  })

  it('says the session model for someone not on the roster, which is what they run on', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({}, 'claude-opus-5')}>
        <Model type="Explore" />
      </CrewProvider>,
    )
    expect(html).toContain('claude-opus-5')
  })

  it('says nothing when even the session model is not known yet', () => {
    const html = renderToStaticMarkup(
      <CrewProvider crew={crew({}, null)}>
        <Model type="Explore" />
      </CrewProvider>,
    )
    expect(html).toContain('unknown')
  })
})

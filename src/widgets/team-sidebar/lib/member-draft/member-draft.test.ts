import { describe, expect, it } from 'vitest'
import { DEFAULT_CHARACTER } from '@/entities/teammate'
import type { AgentDefDraft } from '@/entities/agent-def'
import { characterFor, draftFrom, initialCharacter, toolSummary } from './member-draft'

const existing: AgentDefDraft = {
  name: 'code-reviewer',
  description: 'reads what changed',
  model: 'sonnet',
  character: 'ghost',
  tools: ['Read'],
  knowledge: [],
  prompt: 'look closely',
}

describe('editing does not lose what the form never asked about', () => {
  it('carries the chosen face into the draft, so editing does not wipe it', () => {
    const draft = draftFrom(
      { name: 'reviewer', description: 'd', prompt: 'p', character: 'ghost' },
      existing,
    )
    expect(draft.character).toBe('ghost')
  })

  it('keeps whatever the form does not ask about', () => {
    const draft = draftFrom(
      { name: 'reviewer', description: 'd', prompt: 'p', character: 'star' },
      existing,
    )
    expect(draft.model).toBe('sonnet')
    expect(draft.tools).toEqual(['Read'])
  })

  it('has nothing to keep for someone new', () => {
    const draft = draftFrom({ name: 'n', description: 'd', prompt: 'p', character: 'jelly' }, null)
    expect(draft.model).toBeNull()
    expect(draft.tools).toEqual([])
  })

  it('opens on the face that person already has', () => {
    expect(initialCharacter(existing)).toBe('ghost')
    expect(initialCharacter(null)).toBeNull()
    expect(initialCharacter({ ...existing, character: 'dragon' })).toBeNull()
  })

  it('keeps the default face until somebody picks one', () => {
    // The face used to be read off the name, so editing the name changed their
    // appearance. It stays put now.
    expect(characterFor('star')).toBe('star')
    expect(characterFor(null)).toBe(DEFAULT_CHARACTER)
  })
})

describe('toolSummary: the one line that stands for a list of tools', () => {
  it('says everything when nothing was narrowed down', () => {
    expect(toolSummary([], ['Read', 'Bash'])).toBe('Everything the session has')
  })

  it('counts the chosen against what there is', () => {
    expect(toolSummary(['Read'], ['Read', 'Bash'])).toBe('1 of 2')
  })

  it('admits it does not know before the session has said', () => {
    expect(toolSummary([], [])).toBe('Not known yet')
  })
})

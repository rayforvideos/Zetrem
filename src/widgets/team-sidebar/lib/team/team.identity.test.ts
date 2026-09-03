import { describe, expect, it } from 'vitest'
import type { AgentDef } from '@/entities/agent-def'
import { team } from './team'

function def(name: string): AgentDef {
  return {
    name,
    description: '',
    model: null,
    character: null,
    tools: [],
    knowledge: [],
    prompt: '',
    source: 'user',
    path: `/${name}.md`,
    worktree: true,
  }
}

describe('what a teammate is called and who they are', () => {
  it('tidies the name into something you would call a person', () => {
    expect(team([def('code-reviewer')], [], [])[0]!.name).toBe('Code Reviewer')
  })

  it('keeps identity as the name on disk, because deleting by the tidy name deletes the wrong thing', () => {
    expect(team([def('code-reviewer')], [], [])[0]!.type).toBe('code-reviewer')
  })
})

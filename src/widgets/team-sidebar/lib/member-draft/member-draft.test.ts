import { describe, expect, it } from 'vitest'
import type { AgentDefDraft } from '@/entities/agent-def'
import { characterFor, draftFrom, initialCharacter } from './member-draft'

const existing: AgentDefDraft = {
  name: 'code-reviewer',
  description: 'reads what changed',
  model: 'sonnet',
  character: 'ghost',
  tools: ['Read'],
  prompt: 'look closely',
}

describe('고칠 때 적지 않은 것은 잃지 않는다', () => {
  it('고른 캐릭터가 초안에 실린다 — 편집이 얼굴을 지우면 안 된다', () => {
    const draft = draftFrom(
      { name: 'reviewer', description: 'd', prompt: 'p', character: 'ghost' },
      existing,
    )
    expect(draft.character).toBe('ghost')
  })

  it('폼이 묻지 않는 값은 있던 것을 그대로 지킨다', () => {
    const draft = draftFrom(
      { name: 'reviewer', description: 'd', prompt: 'p', character: 'star' },
      existing,
    )
    expect(draft.model).toBe('sonnet')
    expect(draft.tools).toEqual(['Read'])
  })

  it('새로 들일 때는 지킬 것이 없다', () => {
    const draft = draftFrom({ name: 'n', description: 'd', prompt: 'p', character: 'jelly' }, null)
    expect(draft.model).toBeNull()
    expect(draft.tools).toEqual([])
  })

  it('고칠 때는 그 사람의 얼굴부터 보여준다', () => {
    expect(initialCharacter(existing)).toBe('ghost')
    expect(initialCharacter(null)).toBeNull()
    expect(initialCharacter({ ...existing, character: 'dragon' })).toBeNull()
  })

  it('고른 적 없으면 이름이 정한다', () => {
    expect(characterFor('star', 'anything')).toBe('star')
    expect(characterFor(null, 'Explore')).toBe(characterFor(null, 'Explore'))
  })
})

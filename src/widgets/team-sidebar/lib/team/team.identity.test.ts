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
    prompt: '',
    source: 'user',
    path: `/${name}.md`,
  }
}

describe('team 의 이름과 신원', () => {
  it('부르는 이름은 사람 이름으로 다듬는다', () => {
    expect(team([def('code-reviewer')], [], [])[0]!.name).toBe('Code Reviewer')
  })

  it('신원은 파일에 적힌 이름 그대로다 — 다듬은 이름으로 지우면 엉뚱한 것을 지운다', () => {
    expect(team([def('code-reviewer')], [], [])[0]!.type).toBe('code-reviewer')
  })
})

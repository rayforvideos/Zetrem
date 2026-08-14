import { describe, expect, it } from 'vitest'
import { fileNameOf, parseAgentDef, toAgentFile } from './frontmatter'

const FILE = `---
name: code-reviewer
description: 코드를 본다
model: haiku
tools:
  - Read
  - Grep
---
당신은 코드를 봅니다.

두 번째 문단.
`

describe('parseAgentDef — 디스크의 사람을 읽는다', () => {
  it('머리말과 본문을 갈라 읽는다 — 본문이 그 사람의 지시다', () => {
    const def = parseAgentDef(FILE, 'project', '.claude/agents/code-reviewer.md')
    expect(def).toEqual({
      name: 'code-reviewer',
      description: '코드를 본다',
      model: 'haiku',
      tools: ['Read', 'Grep'],
      prompt: '당신은 코드를 봅니다.\n\n두 번째 문단.',
      source: 'project',
      path: '.claude/agents/code-reviewer.md',
    })
  })

  it('한 줄로 쓴 도구 목록도 읽는다', () => {
    const def = parseAgentDef('---\nname: a\ntools: Read, Grep\n---\n본문', 'user', 'a.md')
    expect(def?.tools).toEqual(['Read', 'Grep'])
  })

  it('allowed-tools 로 쓴 것도 같은 자리로 읽는다', () => {
    const def = parseAgentDef('---\nname: a\nallowed-tools:\n  - Read\n---\n본문', 'user', 'a.md')
    expect(def?.tools).toEqual(['Read'])
  })

  it('이름이 없으면 사람이 아니다 — 명단에 올리지 않는다', () => {
    expect(parseAgentDef('---\ndescription: 없음\n---\n본문', 'user', 'a.md')).toBeNull()
  })

  it('머리말이 없으면 읽지 않는다 — 지어내지 않는다', () => {
    expect(parseAgentDef('그냥 글', 'user', 'a.md')).toBeNull()
    expect(parseAgentDef('---\nname: a\n본문만 있고 닫히지 않음', 'user', 'a.md')).toBeNull()
  })

  it('모르는 값은 없는 것으로 둔다 — 모델을 지어내면 거짓말이 된다', () => {
    const def = parseAgentDef('---\nname: a\n---\n본문', 'user', 'a.md')
    expect(def?.model).toBeNull()
    expect(def?.description).toBe('')
    expect(def?.tools).toEqual([])
  })

  it('따옴표는 값이 아니다', () => {
    const def = parseAgentDef('---\nname: a\ndescription: "코드: 본다"\n---\n본문', 'user', 'a.md')
    expect(def?.description).toBe('코드: 본다')
  })
})

describe('toAgentFile — 새 사람을 디스크에 쓴다', () => {
  it('쓴 것을 그대로 다시 읽을 수 있다', () => {
    const draft = {
      name: 'scout',
      description: '찾아본다',
      model: 'haiku',
      tools: ['Read'],
      prompt: '당신은 찾습니다.',
    }
    const back = parseAgentDef(toAgentFile(draft), 'project', 'p')
    expect(back).toMatchObject(draft)
  })

  it('모델을 안 정하면 그 줄을 쓰지 않는다 — 빈 값을 남기지 않는다', () => {
    const text = toAgentFile({
      name: 'scout',
      description: '',
      model: null,
      tools: [],
      prompt: '본문',
    })
    expect(text).not.toContain('model:')
    expect(text).not.toContain('tools:')
  })

  it('콜론이 든 설명은 감싸서 쓴다 — 안 감싸면 다시 못 읽는다', () => {
    const text = toAgentFile({
      name: 'a',
      description: '코드: 본다',
      model: null,
      tools: [],
      prompt: '본문',
    })
    expect(parseAgentDef(text, 'user', 'a')?.description).toBe('코드: 본다')
  })
})

describe('fileNameOf', () => {
  it('이름을 파일 이름으로 바꾼다', () => {
    expect(fileNameOf('Code Reviewer')).toBe('code-reviewer.md')
    expect(fileNameOf('  코드 검토  ')).toBe('코드-검토.md')
  })

  it('쓸 수 있는 글자가 없으면 기본 이름을 쓴다 — 빈 파일 이름을 만들지 않는다', () => {
    expect(fileNameOf('///')).toBe('agent.md')
  })
})

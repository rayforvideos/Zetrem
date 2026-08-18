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

describe('parseAgentDef: reading a person off disk', () => {
  it('splits the frontmatter from the body, which is what that person was told', () => {
    const def = parseAgentDef(FILE, 'project', '.claude/agents/code-reviewer.md')
    expect(def).toEqual({
      name: 'code-reviewer',
      description: '코드를 본다',
      model: 'haiku',
    character: null,
      tools: ['Read', 'Grep'],
      knowledge: [],
      prompt: '당신은 코드를 봅니다.\n\n두 번째 문단.',
      source: 'project',
      path: '.claude/agents/code-reviewer.md',
    })
  })

  it('reads a tool list written on one line', () => {
    const def = parseAgentDef('---\nname: a\ntools: Read, Grep\n---\n본문', 'user', 'a.md')
    expect(def?.tools).toEqual(['Read', 'Grep'])
  })

  it('reads allowed-tools into the same place', () => {
    const def = parseAgentDef('---\nname: a\nallowed-tools:\n  - Read\n---\n본문', 'user', 'a.md')
    expect(def?.tools).toEqual(['Read'])
  })

  it('takes a file with no name as no one, and leaves it off the roster', () => {
    expect(parseAgentDef('---\ndescription: 없음\n---\n본문', 'user', 'a.md')).toBeNull()
  })

  it('reads nothing out of a file with no frontmatter, rather than inventing it', () => {
    expect(parseAgentDef('그냥 글', 'user', 'a.md')).toBeNull()
    expect(parseAgentDef('---\nname: a\n본문만 있고 닫히지 않음', 'user', 'a.md')).toBeNull()
  })

  it('leaves an unknown value empty, because inventing a model would be a lie', () => {
    const def = parseAgentDef('---\nname: a\n---\n본문', 'user', 'a.md')
    expect(def?.model).toBeNull()
    expect(def?.description).toBe('')
    expect(def?.tools).toEqual([])
  })

  it('does not keep the quotes as part of the value', () => {
    const def = parseAgentDef('---\nname: a\ndescription: "코드: 본다"\n---\n본문', 'user', 'a.md')
    expect(def?.description).toBe('코드: 본다')
  })
})

describe('toAgentFile: writing a new person to disk', () => {
  it('reads back exactly what it wrote', () => {
    const draft = {
      name: 'scout',
      description: '찾아본다',
      model: 'haiku',
    character: null,
      tools: ['Read'],
      knowledge: [],
      prompt: '당신은 찾습니다.',
    }
    const back = parseAgentDef(toAgentFile(draft), 'project', 'p')
    expect(back).toMatchObject(draft)
  })

  it('leaves the model line out when no model was chosen', () => {
    const text = toAgentFile({
      name: 'scout',
      description: '',
      model: null,
    character: null,
      tools: [],
      knowledge: [],
      prompt: '본문',
    })
    expect(text).not.toContain('model:')
    expect(text).not.toContain('tools:')
  })

  it('quotes a description with a colon, because otherwise it cannot be read back', () => {
    const text = toAgentFile({
      name: 'a',
      description: '코드: 본다',
      model: null,
    character: null,
      tools: [],
      knowledge: [],
      prompt: '본문',
    })
    expect(parseAgentDef(text, 'user', 'a')?.description).toBe('코드: 본다')
  })
})

describe('fileNameOf', () => {
  it('turns a name into a file name', () => {
    expect(fileNameOf('Code Reviewer')).toBe('code-reviewer.md')
    expect(fileNameOf('  코드 검토  ')).toBe('코드-검토.md')
  })

  it('uses a default rather than making an empty file name', () => {
    expect(fileNameOf('///')).toBe('agent.md')
  })
})

describe('attached documents: listed in frontmatter, asked for in the body', () => {
  const draft = {
    name: 'Ray',
    description: 'frontend',
    model: null,
    character: null,
    tools: [],
    knowledge: ['docs/architecture.md', 'CONTRIBUTING.md'],
    prompt: '당신은 프론트를 맡는다.',
  }

  it('keeps the list for us and the instruction for the engine', () => {
    const file = toAgentFile(draft)
    expect(file).toContain('knowledge: docs/architecture.md, CONTRIBUTING.md')
    expect(file).toContain('- docs/architecture.md')
    expect(file).toContain('Read these before you start')
  })

  it('gives back only the words you wrote, without the instruction we added', () => {
    const back = parseAgentDef(toAgentFile(draft), 'user', '/ray.md')
    expect(back?.prompt).toBe('당신은 프론트를 맡는다.')
    expect(back?.knowledge).toEqual(['docs/architecture.md', 'CONTRIBUTING.md'])
  })

  it('does not stack the instruction on repeated saves', () => {
    let file = toAgentFile(draft)
    for (let round = 0; round < 3; round += 1) {
      const back = parseAgentDef(file, 'user', '/ray.md')!
      file = toAgentFile(back)
    }
    expect(file.match(/Read these before you start/g)).toHaveLength(1)
    expect(file.match(/- docs\/architecture\.md/g)).toHaveLength(1)
  })

  it('adds no instruction when nothing is attached', () => {
    const file = toAgentFile({ ...draft, knowledge: [] })
    expect(file).not.toContain('knowledge:')
    expect(file).not.toContain('Read these before you start')
  })

  it('reads an older file with no list as an empty list, not a failure', () => {
    const old = ['---', 'name: Old', 'description: before', '---', '', '옛 프롬프트'].join('\n')
    expect(parseAgentDef(old, 'user', '/o.md')?.knowledge).toEqual([])
  })
})

describe('teammates all work in the folder you opened', () => {
  it('never writes an isolation line, since Zetrem does not offer separate copies', () => {
    const file = toAgentFile({
      name: 'siena',
      description: 'reviews',
      model: null,
      character: null,
      tools: [],
      knowledge: [],
      prompt: 'go',
    })
    expect(file).not.toContain('isolation')
  })

  it('reads a file that carries one anyway without tripping over it', () => {
    const read = parseAgentDef('---\nname: x\nisolation: worktree\n---\nbody', 'user', '/x.md')
    expect(read?.name).toBe('x')
    expect(read?.prompt).toBe('body')
  })
})

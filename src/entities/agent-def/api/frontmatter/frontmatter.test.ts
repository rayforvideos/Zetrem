import { describe, expect, it } from 'vitest'
import { briefOf, fileNameOf, parseAgentDef, toAgentFile } from './frontmatter'

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
      worktree: true,
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
      worktree: true,
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
      worktree: true,
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
      worktree: true,
    })
    expect(parseAgentDef(text, 'user', 'a')?.description).toBe('코드: 본다')
  })

  it('reads back a description that carries a quote of its own', () => {
    const description = '"코드": 본다'
    const text = toAgentFile({
      name: 'a',
      description,
      model: null,
      character: null,
      tools: [],
      knowledge: [],
      prompt: '본문',
      worktree: true,
    })
    expect(parseAgentDef(text, 'user', 'a')?.description).toBe(description)
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
    worktree: true,
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
      worktree: true,
    })
    expect(file).not.toContain('isolation')
  })

  it('reads a file that carries one anyway without tripping over it', () => {
    const read = parseAgentDef('---\nname: x\nisolation: worktree\n---\nbody', 'user', '/x.md')
    expect(read?.name).toBe('x')
    expect(read?.prompt).toBe('body')
  })
})

describe('worktree: only a change-making teammate needs the fence, and only some opt out', () => {
  it('stays isolated when the file says nothing at all', () => {
    const read = parseAgentDef('---\nname: x\n---\nbody', 'user', '/x.md')
    expect(read?.worktree).toBe(true)
  })

  it('reads worktree: false as opting out of the fence', () => {
    const read = parseAgentDef('---\nname: x\nworktree: false\n---\nbody', 'user', '/x.md')
    expect(read?.worktree).toBe(false)
  })

  it('reads no/off the same as false, and anything else as staying in', () => {
    expect(parseAgentDef('---\nname: x\nworktree: no\n---\nbody', 'user', '/x.md')?.worktree).toBe(
      false,
    )
    expect(parseAgentDef('---\nname: x\nworktree: off\n---\nbody', 'user', '/x.md')?.worktree).toBe(
      false,
    )
    expect(
      parseAgentDef('---\nname: x\nworktree: true\n---\nbody', 'user', '/x.md')?.worktree,
    ).toBe(true)
  })

  it("treats Claude Code's own isolation key as staying in, since that is what it already meant", () => {
    const read = parseAgentDef('---\nname: x\nisolation: worktree\n---\nbody', 'user', '/x.md')
    expect(read?.worktree).toBe(true)
  })

  it('writes the worktree line only when opting out', () => {
    const on = toAgentFile({
      name: 'a',
      description: '',
      model: null,
      character: null,
      tools: [],
      knowledge: [],
      prompt: 'go',
      worktree: true,
    })
    expect(on).not.toContain('worktree:')

    const off = toAgentFile({
      name: 'a',
      description: '',
      model: null,
      character: null,
      tools: [],
      knowledge: [],
      prompt: 'go',
      worktree: false,
    })
    expect(off).toContain('worktree: false')
    expect(off).not.toContain('isolation')
  })

  it('round-trips an opt-out through the file', () => {
    const draft = {
      name: 'siena',
      description: 'reviews',
      model: null,
      character: null,
      tools: [],
      knowledge: [],
      prompt: 'go',
      worktree: false,
    }
    const back = parseAgentDef(toAgentFile(draft), 'user', '/siena.md')
    expect(back?.worktree).toBe(false)
  })
})

describe('briefOf: the brief as the session must receive it', () => {
  it('adds the reading order, which --agents carries no other way', () => {
    expect(briefOf('go', ['/a.md', '/b.md'])).toBe(
      'go\n\nRead these before you start, and work by what they say:\n- /a.md\n- /b.md',
    )
  })

  it('keeps our own marker out of it, since that is plumbing and not an instruction', () => {
    expect(briefOf('go', ['/a.md'])).not.toContain('zetrem:knowledge')
  })

  it('leaves a brief with nothing attached exactly as written', () => {
    expect(briefOf('go', [])).toBe('go')
  })

  it('survives the round trip through a file', () => {
    const draft = {
      name: 'siena',
      description: 'reviews',
      model: null,
      character: null,
      tools: [],
      knowledge: ['/a.md'],
      prompt: 'go',
      worktree: true,
    }
    const read = parseAgentDef(toAgentFile(draft), 'user', '/siena.md')
    expect(read?.prompt).toBe('go')
    expect(read?.knowledge).toEqual(['/a.md'])
    expect(briefOf(read?.prompt ?? '', read?.knowledge ?? [])).toBe(briefOf('go', ['/a.md']))
  })
})

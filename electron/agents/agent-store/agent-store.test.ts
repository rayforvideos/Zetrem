import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listAgentDefs, removeAgentDef, replaceAgentDef, writeAgentDef } from './agent-store'

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zetrem-agents-'))
}

const draft = {
  name: 'code reviewer',
  description: '고친 자리를 본다',
  model: 'sonnet',
  character: null,
  tools: ['Read'],
  knowledge: [],
  prompt: '당신은 고친 자리를 봅니다.',
}

describe('writeAgentDef: a new person is kept in the app folder', () => {
  it('makes the folder if it is missing and writes', async () => {
    const dir = join(await scratch(), 'agents')
    const path = await writeAgentDef(dir, draft)
    expect(path).toBe(join(dir, 'code-reviewer.md'))
    expect(await readFile(path, 'utf8')).toContain('name: code reviewer')
  })

  it('shows up on the roster right away, or nothing seems to have happened', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)
    const defs = await listAgentDefs(dir)
    expect(defs.map((def) => def.name)).toEqual(['code reviewer'])
    expect(defs[0]).toMatchObject({ description: '고친 자리를 본다', model: 'sonnet' })
  })

  it('cannot escape the folder through a name with a path in it', async () => {
    const dir = await scratch()
    const path = await writeAgentDef(dir, { ...draft, name: '../../../etc/passwd' })
    expect(path.startsWith(dir)).toBe(true)
  })

  it('overwrites on the same name, so one person does not become two', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)
    await writeAgentDef(dir, { ...draft, description: '바뀐 설명' })
    const defs = await listAgentDefs(dir)
    expect(defs.length).toBe(1)
    expect(defs[0]?.description).toBe('바뀐 설명')
  })
})

describe('listAgentDefs', () => {
  it('holds up when the folder does not exist at all', async () => {
    expect(await listAgentDefs(join(await scratch(), 'nope'))).toEqual([])
  })

  it('sorts by name, so the eye can learn where things are', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, { ...draft, name: 'zeta' })
    await writeAgentDef(dir, { ...draft, name: 'alpha' })
    expect((await listAgentDefs(dir)).map((def) => def.name)).toEqual(['alpha', 'zeta'])
  })
})

describe('removeAgentDef: someone let go leaves the roster', () => {
  it('deletes the file and drops off the list', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)
    expect(await listAgentDefs(dir)).toHaveLength(1)

    await removeAgentDef(dir, draft.name)
    expect(await listAgentDefs(dir)).toHaveLength(0)
  })

  it('does not blow up on someone who is not there, so a second press is the same', async () => {
    const dir = await scratch()
    await expect(removeAgentDef(dir, 'nobody')).resolves.toBeUndefined()
  })

  it('touches nothing outside the roster folder', async () => {
    const parent = await scratch()
    const dir = join(parent, 'agents')
    const outside = join(parent, 'secret.md')
    await writeFile(outside, 'keep me', 'utf8')

    await removeAgentDef(dir, '../secret')

    expect(await readFile(outside, 'utf8')).toBe('keep me')
  })
})

describe('replaceAgentDef: editing does not turn one person into two', () => {
  it('leaves no old file behind when the name changes', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)

    await replaceAgentDef(dir, { ...draft, name: 'reviewer' }, draft.name)

    const defs = await listAgentDefs(dir)
    expect(defs.map((def) => def.name)).toEqual(['reviewer'])
  })

  it('changes only that file when the name stays', async () => {
    const dir = await scratch()
    const path = await writeAgentDef(dir, draft)

    await replaceAgentDef(dir, { ...draft, description: '새 설명', character: 'ghost' }, draft.name)

    const defs = await listAgentDefs(dir)
    expect(defs).toHaveLength(1)
    expect(defs[0]?.description).toBe('새 설명')
    expect(defs[0]?.character).toBe('ghost')
    expect(defs[0]?.path).toBe(path)
  })

  it('deletes nothing when the old name points outside the roster', async () => {
    const parent = await scratch()
    const dir = join(parent, 'agents')
    const outside = join(parent, 'secret.md')
    await writeFile(outside, 'keep me', 'utf8')

    await replaceAgentDef(dir, draft, '../secret')

    expect(await readFile(outside, 'utf8')).toBe('keep me')
  })
})

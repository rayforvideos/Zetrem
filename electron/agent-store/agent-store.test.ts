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
  prompt: '당신은 고친 자리를 봅니다.',
}

describe('writeAgentDef — 새 사람이 앱의 폴더에 남는다', () => {
  it('폴더가 없으면 만들고 쓴다', async () => {
    const dir = join(await scratch(), 'agents')
    const path = await writeAgentDef(dir, draft)
    expect(path).toBe(join(dir, 'code-reviewer.md'))
    expect(await readFile(path, 'utf8')).toContain('name: code reviewer')
  })

  it('쓴 사람이 곧바로 명단에 뜬다 — 이게 안 되면 화면에서 아무 일도 안 일어난 것으로 보인다', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)
    const defs = await listAgentDefs(dir)
    expect(defs.map((def) => def.name)).toEqual(['code reviewer'])
    expect(defs[0]).toMatchObject({ description: '고친 자리를 본다', model: 'sonnet' })
  })

  it('이름에 경로를 넣어도 폴더 바깥으로 못 나간다', async () => {
    const dir = await scratch()
    const path = await writeAgentDef(dir, { ...draft, name: '../../../etc/passwd' })
    expect(path.startsWith(dir)).toBe(true)
  })

  it('같은 이름을 다시 들이면 덮어쓴다 — 같은 사람이 둘이 되지 않는다', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)
    await writeAgentDef(dir, { ...draft, description: '바뀐 설명' })
    const defs = await listAgentDefs(dir)
    expect(defs.length).toBe(1)
    expect(defs[0]?.description).toBe('바뀐 설명')
  })
})

describe('listAgentDefs', () => {
  it('폴더가 아예 없어도 무너지지 않는다', async () => {
    expect(await listAgentDefs(join(await scratch(), 'nope'))).toEqual([])
  })

  it('이름 순으로 세운다 — 명단의 순서가 매번 달라지면 눈이 자리를 못 외운다', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, { ...draft, name: 'zeta' })
    await writeAgentDef(dir, { ...draft, name: 'alpha' })
    expect((await listAgentDefs(dir)).map((def) => def.name)).toEqual(['alpha', 'zeta'])
  })
})

describe('removeAgentDef — 내보낸 사람은 명단에서 사라진다', () => {
  it('파일을 지우고 명단에서 빠진다', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)
    expect(await listAgentDefs(dir)).toHaveLength(1)

    await removeAgentDef(dir, draft.name)
    expect(await listAgentDefs(dir)).toHaveLength(0)
  })

  it('없는 사람을 내보내도 터지지 않는다 — 두 번 눌러도 같은 결과다', async () => {
    const dir = await scratch()
    await expect(removeAgentDef(dir, 'nobody')).resolves.toBeUndefined()
  })

  it('명단 바깥은 건드리지 않는다 — 이름으로 폴더를 빠져나갈 수 없다', async () => {
    const parent = await scratch()
    const dir = join(parent, 'agents')
    const outside = join(parent, 'secret.md')
    await writeFile(outside, 'keep me', 'utf8')

    await removeAgentDef(dir, '../secret')

    expect(await readFile(outside, 'utf8')).toBe('keep me')
  })
})

describe('replaceAgentDef — 고쳐도 사람이 둘로 늘지 않는다', () => {
  it('이름을 바꾸면 옛 파일은 남지 않는다', async () => {
    const dir = await scratch()
    await writeAgentDef(dir, draft)

    await replaceAgentDef(dir, { ...draft, name: 'reviewer' }, draft.name)

    const defs = await listAgentDefs(dir)
    expect(defs.map((def) => def.name)).toEqual(['reviewer'])
  })

  it('이름을 그대로 두고 고치면 그 파일만 바뀐다', async () => {
    const dir = await scratch()
    const path = await writeAgentDef(dir, draft)

    await replaceAgentDef(dir, { ...draft, description: '새 설명', character: 'ghost' }, draft.name)

    const defs = await listAgentDefs(dir)
    expect(defs).toHaveLength(1)
    expect(defs[0]?.description).toBe('새 설명')
    expect(defs[0]?.character).toBe('ghost')
    expect(defs[0]?.path).toBe(path)
  })

  it('옛 이름이 명단 바깥을 가리켜도 그 파일을 지우지 않는다', async () => {
    const parent = await scratch()
    const dir = join(parent, 'agents')
    const outside = join(parent, 'secret.md')
    await writeFile(outside, 'keep me', 'utf8')

    await replaceAgentDef(dir, draft, '../secret')

    expect(await readFile(outside, 'utf8')).toBe('keep me')
  })
})

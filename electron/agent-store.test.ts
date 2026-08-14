import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listAgentDefs, writeAgentDef } from './agent-store'

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'zetrem-agents-'))
}

const draft = {
  name: 'code reviewer',
  description: '고친 자리를 본다',
  model: 'sonnet',
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
    const path = await writeAgentDef(dir, { ...draft, name: '../../etc/passwd' })
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

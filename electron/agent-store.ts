import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileNameOf, parseAgentDef, toAgentFile } from '../src/entities/agent-def'
import type { AgentDef, AgentDefDraft } from '../src/entities/agent-def'

async function readDir(dir: string, source: AgentDef['source']): Promise<AgentDef[]> {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const out: AgentDef[] = []
  for (const name of names) {
    if (!name.endsWith('.md')) continue
    const path = join(dir, name)
    try {
      const def = parseAgentDef(await readFile(path, 'utf8'), source, path)
      if (def !== null) out.push(def)
    } catch {
      continue
    }
  }
  return out
}

// 사람은 앱에 속한다. 프로젝트의 .claude/agents 에 두면 폴더마다 명단이 달라지고,
// 사용자의 ~/.claude/agents 에 두면 그 사람의 CLI 설정을 우리가 건드리게 된다.
// 그래서 Zetrem 의 폴더에 두고, 세션마다 --agents 로 실어 보낸다 (어느 프로젝트에서든 같은 명단).
export async function listAgentDefs(dir: string): Promise<AgentDef[]> {
  const defs = await readDir(dir, 'user')
  return defs.sort((a, b) => a.name.localeCompare(b.name))
}

export async function writeAgentDef(dir: string, draft: AgentDefDraft): Promise<string> {
  const root = resolve(dir)
  const path = resolve(root, fileNameOf(draft.name))
  if (!path.startsWith(`${root}/`)) throw new Error('명단 바깥에는 쓰지 않는다')
  await mkdir(root, { recursive: true })
  await writeFile(path, toAgentFile(draft), 'utf8')
  return path
}

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileNameOf, parseAgentDef, toAgentFile } from '../../src/entities/agent-def'
import type { AgentDef, AgentDefDraft } from '../../src/entities/agent-def'

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

export async function listAgentDefs(dir: string): Promise<AgentDef[]> {
  const defs = await readDir(dir, 'user')
  return defs.sort((a, b) => a.name.localeCompare(b.name))
}

export async function writeAgentDef(dir: string, draft: AgentDefDraft): Promise<string> {
  const root = resolve(dir)
  const path = resolve(root, fileNameOf(draft.name))
  if (!path.startsWith(`${root}/`)) throw new Error('refusing to write outside the roster directory')
  await mkdir(root, { recursive: true })
  await writeFile(path, toAgentFile(draft), 'utf8')
  return path
}

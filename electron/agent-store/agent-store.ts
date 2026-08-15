import { readFile, readdir, mkdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { saveFile } from '../save-file/save-file'
import { fileNameOf, parseAgentDef, toAgentFile } from '@/entities/agent-def'
import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'

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

function insideRoster(dir: string, name: string): string {
  const root = resolve(dir)
  const path = resolve(root, fileNameOf(name))
  if (!path.startsWith(`${root}/`)) throw new Error('refusing to touch a path outside the roster')
  return path
}

export async function removeAgentDef(dir: string, name: string): Promise<void> {
  await rm(insideRoster(dir, name), { force: true })
}

export async function replaceAgentDef(
  dir: string,
  draft: AgentDefDraft,
  previousName: string,
): Promise<string> {
  const path = await writeAgentDef(dir, draft)
  const before = insideRoster(dir, previousName)
  if (before !== path) await rm(before, { force: true })
  return path
}

export async function writeAgentDef(dir: string, draft: AgentDefDraft): Promise<string> {
  const root = resolve(dir)
  const path = insideRoster(dir, draft.name)
  await mkdir(root, { recursive: true })
  await saveFile(path, toAgentFile(draft))
  return path
}

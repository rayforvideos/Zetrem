import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { MemoryEntry, MemoryNote } from '@/entities/agent-memory/model/note'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { handle } from '../../ipc/ipc'
import { recallProject } from '../../store/project-memory/project-memory'
import type { MemoryDeps } from './agent-memory.types'

// Claude Code names a project's folder by its absolute path with every
// character outside [A-Za-z0-9-] turned into a dash, one for one (measured
// 2026-09-01 against ~/.claude/projects).
export function mungedPath(project: string): string {
  return project.replace(/[^A-Za-z0-9-]/g, '-')
}

// The file name is the key the renderer hands back; only a plain markdown
// name that cannot leave the folder is ever one of ours.
const NOTE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/
const INDEX = 'MEMORY.md'

export function isNoteId(id: string): boolean {
  return NOTE_ID.test(id) && !id.includes('..') && id !== INDEX
}

type Front = { name: string; description: string; kind: string }

// The frontmatter is a fenced block of simple `key: value` lines; the two
// named lines are all the list needs, and a file without them still lists
// under its own file name.
export function frontOf(body: string): Front {
  const found: Front = { name: '', description: '', kind: '' }
  if (!body.startsWith('---')) return found
  const end = body.indexOf('\n---', 3)
  if (end < 0) return found
  for (const line of body.slice(3, end).split('\n')) {
    const at = line.indexOf(':')
    if (at < 0) continue
    const key = line.slice(0, at).trim()
    const value = line
      .slice(at + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (key === 'name' && found.name === '') found.name = value
    if (key === 'description' && found.description === '') found.description = value
    if (key === 'type' && found.kind === '') found.kind = value
  }
  return found
}

// The frontmatter block is kept aside whole, so an edit to the body can
// never disturb what the fence holds beyond the one description line.
function splitNote(text: string): { front: string; body: string } {
  if (!text.startsWith('---')) return { front: '', body: text }
  const end = text.indexOf('\n---', 3)
  if (end < 0) return { front: '', body: text }
  const after = end + '\n---'.length
  const front = text.slice(0, after)
  const body = text.slice(after).replace(/^\n+/, '')
  return { front, body }
}

function withDescription(front: string, description: string): string {
  if (front.length === 0) return front
  const line = `description: ${JSON.stringify(description)}`
  const lines = front.split('\n')
  const at = lines.findIndex((one) => one.trimStart().startsWith('description:'))
  if (at >= 0) lines[at] = line
  else lines.splice(lines.length - 1, 0, line)
  return lines.join('\n')
}

function joinNote(front: string, body: string): string {
  const tail = body.endsWith('\n') || body.length === 0 ? body : `${body}\n`
  return front.length === 0 ? tail : `${front}\n\n${tail}`
}

// Dropping a note also drops its line in the index, matched by the file name
// in the line's link target.
export function withoutIndexLine(index: string, id: string): string {
  return index
    .split('\n')
    .filter((line) => !line.includes(`(${id})`))
    .join('\n')
}

function liveDeps(): MemoryDeps {
  return { projectsDir: join(homedir(), '.claude', 'projects'), here: recallProject }
}

async function memoryDir(deps: MemoryDeps): Promise<Outcome<string>> {
  const project = await deps.here()
  if (project === null) return lost('refused', 'no-project')
  return won(join(deps.projectsDir, mungedPath(project), 'memory'))
}

export async function listMemory(deps: MemoryDeps): Promise<Outcome<MemoryEntry[]>> {
  const dir = await memoryDir(deps)
  if (!dir.ok) return dir
  const names = await readdir(dir.value).catch(() => [] as string[])
  const out: MemoryEntry[] = []
  for (const name of names.filter(isNoteId).sort()) {
    const path = join(dir.value, name)
    const body = await readFile(path, 'utf8').catch(() => null)
    if (body === null) continue
    const front = frontOf(body)
    const updated = await stat(path).then(
      (found) => found.mtimeMs,
      () => 0,
    )
    out.push({
      id: name,
      name: front.name.length > 0 ? front.name : name.replace(/\.md$/, ''),
      description: front.description,
      kind: front.kind,
      updated,
    })
  }
  return won(out)
}

export async function readMemory(deps: MemoryDeps, id: string): Promise<Outcome<MemoryNote>> {
  if (!isNoteId(id)) return lost('refused', 'note-id')
  const dir = await memoryDir(deps)
  if (!dir.ok) return dir
  const text = await readFile(join(dir.value, id), 'utf8').catch(() => null)
  if (text === null) return lost('failed', 'gone')
  const front = frontOf(text)
  const parts = splitNote(text)
  return won({
    name: front.name.length > 0 ? front.name : id.replace(/\.md$/, ''),
    description: front.description,
    kind: front.kind,
    body: parts.body,
  })
}

export async function writeMemory(
  deps: MemoryDeps,
  id: string,
  body: string,
  description: string,
): Promise<Outcome<null>> {
  if (!isNoteId(id)) return lost('refused', 'note-id')
  const dir = await memoryDir(deps)
  if (!dir.ok) return dir
  const kept = await readFile(join(dir.value, id), 'utf8').catch(() => null)
  if (kept === null) return lost('failed', 'gone')
  const parts = splitNote(kept)
  const next = joinNote(withDescription(parts.front, description), body)
  const put = await writeFile(join(dir.value, id), next, 'utf8').then(
    () => true,
    () => false,
  )
  return put ? won(null) : lost('failed', 'write')
}

export async function removeMemory(deps: MemoryDeps, id: string): Promise<Outcome<null>> {
  if (!isNoteId(id)) return lost('refused', 'note-id')
  const dir = await memoryDir(deps)
  if (!dir.ok) return dir
  const gone = await rm(join(dir.value, id)).then(
    () => true,
    () => false,
  )
  if (!gone) return lost('failed', 'gone')
  const index = await readFile(join(dir.value, INDEX), 'utf8').catch(() => null)
  if (index !== null) {
    await writeFile(join(dir.value, INDEX), withoutIndexLine(index, id), 'utf8').catch(
      () => undefined,
    )
  }
  return won(null)
}

export function registerAgentMemory(): void {
  const deps = liveDeps()
  handle('memory:list', () => listMemory(deps))
  handle('memory:read', (_event, id) => readMemory(deps, id))
  handle('memory:write', (_event, id, body, description) =>
    writeMemory(deps, id, body, description),
  )
  handle('memory:remove', (_event, id) => removeMemory(deps, id))
}

import { mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { saveFile } from '../../save-file/save-file'
import { transcriptKey } from '../../transcript-key/transcript-key'
import { CHAT_CAP } from '../../transcript-store'
import type { StoredProject } from '../projects.types'

type Memory = { current: string | null; projects: StoredProject[] }

// A category used to be a second project wearing the same folder. One folder is
// one project now, so every folder that grew categories has to fold back into a
// single row — and the chats each category kept in its own hashed directory have
// to end up in the one directory the folder project reads.
//
// Nothing here deletes a chat. A folder that gathers more than the store's cap
// would be pruned down on the next autosave, so the overflow is set aside in a
// place the prune does not read instead.

function transcripts(userData: string, project: string): string {
  return join(userData, 'transcripts', transcriptKey(project))
}

async function chatFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((name) => name.endsWith('.json'))
  } catch {
    return []
  }
}

async function freshness(path: string): Promise<number> {
  return stat(path).then(
    (info) => info.mtimeMs,
    () => 0,
  )
}

// The survivor is the row whose id IS the folder, the way every project made
// before categories existed was keyed. Failing that, one is made that way, so
// the folder lands on the directory a fresh install would have used.
function survivorOf(path: string, rows: StoredProject[]): StoredProject {
  const worn = rows.find((one) => one.id === path)
  if (worn !== undefined) return worn
  const oldest = [...rows].sort((a, b) => a.createdAtMs - b.createdAtMs)[0]
  return {
    id: path,
    name: basename(path),
    path,
    createdAtMs: oldest?.createdAtMs ?? 0,
    lastOpenedAtMs: Math.max(...rows.map((one) => one.lastOpenedAtMs)),
  }
}

async function setAside(userData: string, path: string, from: string): Promise<void> {
  const aside = join(transcripts(userData, path), 'overflow')
  await mkdir(aside, { recursive: true }).catch(() => undefined)
  await rename(from, join(aside, basename(from))).catch(() => undefined)
}

// Everything the folder project will hold, freshest first. Only the cap's worth
// stays where the store reads; the rest is set aside unread but unlost.
async function gather(userData: string, path: string, losers: StoredProject[]): Promise<void> {
  const home = transcripts(userData, path)
  await mkdir(home, { recursive: true }).catch(() => undefined)

  const held = new Set(await chatFiles(home))
  const carried: string[] = []

  for (const loser of losers) {
    const dir = transcripts(userData, loser.id)
    for (const name of await chatFiles(dir)) {
      const from = join(dir, name)
      // A name already in the folder is not overwritten: the one that was
      // there stays, and the newcomer is set aside under its own name.
      if (held.has(name)) {
        await setAside(userData, path, from)
        continue
      }
      await rename(from, join(home, name)).catch(() => undefined)
      held.add(name)
      carried.push(name)
    }
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }

  if (carried.length === 0) return

  const names = await chatFiles(home)
  if (names.length <= CHAT_CAP) return
  const dated = await Promise.all(
    names.map(async (name) => ({ name, at: await freshness(join(home, name)) })),
  )
  const stale = dated.sort((a, b) => b.at - a.at || a.name.localeCompare(b.name)).slice(CHAT_CAP)
  for (const one of stale) await setAside(userData, path, join(home, one.name))
}

export async function collapseCategories(userData: string): Promise<void> {
  const file = join(userData, 'projects.json')
  let memory: Memory
  try {
    memory = JSON.parse(await readFile(file, 'utf8')) as Memory
  } catch {
    return
  }
  const rows = Array.isArray(memory.projects) ? memory.projects : []
  const paths = [...new Set(rows.map((one) => one.path))]
  if (paths.length === rows.length) return

  const kept: StoredProject[] = []
  let current = memory.current
  for (const path of paths) {
    const wearing = rows.filter((one) => one.path === path)
    const survivor = survivorOf(path, wearing)
    kept.push(survivor)
    const losers = wearing.filter((one) => one.id !== survivor.id)
    if (losers.some((one) => one.id === current)) current = survivor.id
    await gather(userData, path, losers)
  }

  await saveFile(file, JSON.stringify({ current, projects: kept })).catch(() => undefined)
}

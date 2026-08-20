import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { isChatId, readTranscript, summaryOf } from '@/entities/conversation/lib/transcript/transcript'
import type { ChatSummary, Transcript } from '@/entities/conversation/lib/transcript/transcript.types'
import { handle } from './ipc/ipc'
import { queue } from './queue/queue'
import { saveFile } from './save-file/save-file'
import { staleChats } from './stale-chats/stale-chats'

const CHAT_CAP = 60

const queued = queue()

function folder(project: string): string {
  const key = createHash('sha256').update(project).digest('hex').slice(0, 32)
  return join(app.getPath('userData'), 'transcripts', key)
}

function chatPath(project: string, id: string): string {
  return join(folder(project), `${id}.json`)
}

function named(project: unknown, id: unknown): { project: string; id: string } | null {
  if (typeof project !== 'string' || project.length === 0) return null
  if (!isChatId(id)) return null
  return { project, id }
}

async function load(project: string, id: string): Promise<Transcript | null> {
  const path = chatPath(project, id)
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return null
  }
  try {
    const transcript = readTranscript(JSON.parse(text))
    if (transcript !== null) return transcript
  } catch {
    // fall through to quarantine below
  }
  // A file that reads but does not parse into a transcript would otherwise be
  // re-parsed on every list. Move it aside so it stops costing anything.
  await rename(path, `${path}.broken`).catch(() => undefined)
  return null
}

async function chats(project: string): Promise<Transcript[]> {
  let names: string[]
  try {
    names = await readdir(folder(project))
  } catch {
    return []
  }
  const found: Transcript[] = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const transcript = await load(project, name.slice(0, -'.json'.length))
    if (transcript !== null) found.push(transcript)
  }
  return found.sort((a, b) => b.savedAtMs - a.savedAtMs)
}

async function prune(project: string): Promise<void> {
  let names: string[]
  try {
    names = (await readdir(folder(project))).filter((name) => name.endsWith('.json'))
  } catch {
    return
  }
  if (names.length <= CHAT_CAP) return
  const dated = await Promise.all(
    names.map(async (name) => {
      const path = join(folder(project), name)
      const at = await stat(path).then(
        (info) => info.mtimeMs,
        () => 0,
      )
      return { path, at }
    }),
  )
  for (const path of staleChats(dated, CHAT_CAP)) {
    await rm(path, { force: true }).catch(() => undefined)
  }
}

export function registerTranscriptStore(): void {
  handle('transcript:list', async (_event, project: unknown): Promise<ChatSummary[]> => {
    if (typeof project !== 'string' || project.length === 0) return []
    return (await chats(project)).slice(0, CHAT_CAP).map(summaryOf)
  })

  handle(
    'transcript:read',
    async (_event, project: unknown, id: unknown): Promise<Transcript | null> => {
      const target = named(project, id)
      return target === null ? null : load(target.project, target.id)
    },
  )

  handle('transcript:write', async (_event, project: unknown, saved: unknown): Promise<void> => {
    if (typeof project !== 'string' || project.length === 0) return
    const transcript = readTranscript(saved)
    if (transcript === null) return
    await queued(async () => {
      const kept = transcript.spend === null ? await load(project, transcript.id) : null
      const merged = kept?.spend == null ? transcript : { ...transcript, spend: kept.spend }
      await mkdir(folder(project), { recursive: true }).catch(() => undefined)
      await saveFile(chatPath(project, merged.id), JSON.stringify(merged)).catch(
        (cause: unknown) => console.error('could not save the conversation', cause),
      )
      await prune(project)
    })
  })

  handle('transcript:forget', async (_event, project: unknown, id: unknown): Promise<void> => {
    const target = named(project, id)
    if (target === null) return
    await queued(() => rm(chatPath(target.project, target.id), { force: true }).catch(() => undefined))
  })
}

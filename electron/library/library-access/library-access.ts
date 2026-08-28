import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { queue } from '../../store/queue/queue'
import { saveFile } from '../../store/save-file/save-file'

// On disk: library-agents.json under userData. Which projects have closed their
// library to agents, keyed by workspace path; a project not listed is open. Kept
// here and not in the project, so the choice is this machine's and never travels
// with the folder.
type Closed = Record<string, boolean>

function accessPath(): string {
  return join(app.getPath('userData'), 'library-agents.json')
}

async function readClosed(): Promise<Closed> {
  try {
    const parsed: unknown = JSON.parse(await readFile(accessPath(), 'utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, on]) => on === false),
    ) as Closed
  } catch (cause: unknown) {
    if ((cause as { code?: string }).code === 'ENOENT') return {}
    const kept = `${accessPath()}.broken`
    await rename(accessPath(), kept).catch(() => undefined)
    console.error(`the library switches were unreadable, kept a copy at ${kept}`, cause)
    return {}
  }
}

const queued = queue()

export async function libraryOpenToAgents(workspace: string): Promise<boolean> {
  return (await readClosed())[workspace] !== false
}

export function setLibraryOpenToAgents(workspace: string, open: boolean): Promise<void> {
  return queued(async () => {
    const closed = await readClosed()
    if (open) delete closed[workspace]
    else closed[workspace] = false
    await saveFile(accessPath(), JSON.stringify(closed, null, 2)).catch((cause: unknown) =>
      console.error('could not save who may read the library', cause),
    )
  })
}

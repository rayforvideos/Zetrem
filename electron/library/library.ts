import { createHash } from 'node:crypto'
import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { mkdir, realpath, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { BrowserWindow, app } from 'electron'
import { handle, push } from '../ipc/ipc'
import { workspaceDir } from '../shell/workspace-dir/workspace-dir'
import { recallProject } from '../store/project-memory/project-memory'
import { libraryOpenToAgents, setLibraryOpenToAgents } from './library-access/library-access'
import { openLibraryIndex } from './library-index/library-index'
import type { LibraryIndex } from './library-index/library-index.types'
import { mcpConfigFor, startLibraryMcp } from './library-mcp/library-mcp'
import type { LibraryMcp, LibraryTools } from './library-mcp/library-mcp.types'
import {
  addFolder,
  createNote,
  fileNote,
  isFolderName,
  listNotes,
  notesForIndex,
  readNote,
  removeFolder,
  removeNote,
  renameFolder,
  renameNote,
  writeNote,
} from './library-notes/library-notes'

const OLD_FILES = ['CLAUDE.md', '.zetrem']
const SETTLE_MS = 300

// The library travels with the work: a project's own folder, or the scratch
// workspace when no project is picked.
export function libraryRootFor(workspace: string): string {
  return join(workspace, '.zetrem', 'library')
}

// Earlier versions put files of their own into the folder: the agent's
// instructions and an empty marker. Neither is written any more, so both go.
async function sweepOldFiles(root: string): Promise<void> {
  await Promise.all(
    OLD_FILES.map((name) => rm(join(root, name), { force: true }).catch(() => undefined)),
  )
  await rm(join(app.getPath('userData'), 'library-mcp'), { recursive: true, force: true }).catch(
    () => undefined,
  )
}

export async function ensureLibrary(root: string): Promise<void> {
  await mkdir(root, { recursive: true })
  await sweepOldFiles(root)
}

async function currentRoot(): Promise<string> {
  const workspace = await workspaceDir(await recallProject(), app.getPath('userData'))
  const root = libraryRootFor(workspace)
  await ensureLibrary(root)
  return root
}

// One derived index per library, named by where the library really is.
async function indexKey(root: string): Promise<string> {
  const real = await realpath(root).catch(() => root)
  return createHash('sha1').update(real).digest('hex').slice(0, 16)
}

const indexes = new Map<string, LibraryIndex>()
const watchers = new Map<string, FSWatcher>()

function tellRenderers(): void {
  for (const win of BrowserWindow.getAllWindows()) push(win.webContents, 'library:changed', null)
}

async function indexFor(root: string): Promise<LibraryIndex> {
  const key = await indexKey(root)
  let index = indexes.get(key)
  if (index === undefined) {
    const dir = join(app.getPath('userData'), 'library-index')
    await mkdir(dir, { recursive: true })
    index = openLibraryIndex(join(dir, `${key}.sqlite`))
    indexes.set(key, index)
  }
  index.sync(await notesForIndex(root))
  return index
}

// The agent writes files, the person writes files, git pulls files: the
// screen and the index learn about all of them the same way.
function follow(root: string): void {
  if (watchers.has(root)) return
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    const watcher = watch(root, { recursive: true }, () => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void indexFor(root).then(tellRenderers, () => undefined)
      }, SETTLE_MS)
    })
    watcher.on('error', () => {
      watcher.close()
      watchers.delete(root)
    })
    watchers.set(root, watcher)
  } catch {
    // A file system that cannot be watched still gets read on every open.
  }
}

export function stopFollowing(): void {
  for (const watcher of watchers.values()) watcher.close()
  watchers.clear()
  for (const index of indexes.values()) index.close()
  indexes.clear()
}

// One server per library, so a tool call from a session lands in that
// session's workspace whatever project the screen is showing.
const servers = new Map<string, LibraryMcp>()

function toolsFor(root: string): LibraryTools {
  return {
    async search(query, limit) {
      return (await indexFor(root)).search(query, limit)
    },
    async read(id) {
      return readNote(root, id)
    },
    async write(input) {
      const folder = input.folder ?? ''
      if (folder.length > 0 && !isFolderName(folder)) return null
      const started = await createNote(root, folder, input.title)
      if (started === null) return null
      return writeNote(root, started.id, input.body, { tags: input.tags ?? [], source: 'agent' })
    },
    async recent(limit) {
      return (await indexFor(root)).recent(limit)
    },
  }
}

async function serverFor(root: string): Promise<LibraryMcp> {
  const running = servers.get(root)
  if (running !== undefined) return running
  const server = await startLibraryMcp(toolsFor(root))
  servers.set(root, server)
  return server
}

// What a session is handed so its agent can read the library as files and
// search it as a tool. Nothing, when the project has closed its library to
// agents: then the agent neither sees the folder nor gets the tools.
export async function librarySessionArgs(workspace: string): Promise<string[]> {
  if (!(await libraryOpenToAgents(workspace))) return []
  const root = libraryRootFor(workspace)
  await ensureLibrary(root)
  follow(root)
  // The CLI takes the MCP config as a JSON string, so nothing is written for it.
  return ['--add-dir', root, '--mcp-config', mcpConfigFor(await serverFor(root))]
}

export async function closeLibraryMcp(): Promise<void> {
  const running = [...servers.values()]
  servers.clear()
  await Promise.all(running.map((server) => server.close()))
}

async function currentWorkspace(): Promise<string> {
  return workspaceDir(await recallProject(), app.getPath('userData'))
}

export function registerLibrary(): void {
  handle('library:agents', async () => libraryOpenToAgents(await currentWorkspace()))
  handle('library:agents-set', async (_event, open) => {
    if (typeof open !== 'boolean') return libraryOpenToAgents(await currentWorkspace())
    const workspace = await currentWorkspace()
    await setLibraryOpenToAgents(workspace, open)
    return libraryOpenToAgents(workspace)
  })
  handle('library:list', async () => {
    const root = await currentRoot()
    follow(root)
    void indexFor(root).catch(() => undefined)
    return listNotes(root)
  })
  handle('library:read', async (_event, id) => readNote(await currentRoot(), id))
  handle('library:remove', async (_event, id) => removeNote(await currentRoot(), id))
  handle('library:write', async (_event, id, body, patch) =>
    writeNote(await currentRoot(), id, body, patch ?? {}),
  )
  handle('library:create', async (_event, folder, title) =>
    createNote(await currentRoot(), folder, title),
  )
  handle('library:rename', async (_event, id, title) => renameNote(await currentRoot(), id, title))
  handle('library:file', async (_event, text) => fileNote(await currentRoot(), text))
  handle('library:search', async (_event, query) => {
    const root = await currentRoot()
    return (await indexFor(root)).search(query)
  })
  handle('library:backlinks', async (_event, id) => {
    const root = await currentRoot()
    const note = await readNote(root, id)
    if (note === null) return []
    return (await indexFor(root)).backlinks(note.title)
  })
  handle('library:folder-add', async (_event, name) => addFolder(await currentRoot(), name))
  handle('library:folder-rename', async (_event, name, next) =>
    renameFolder(await currentRoot(), name, next),
  )
  handle('library:folder-remove', async (_event, name) => removeFolder(await currentRoot(), name))
}

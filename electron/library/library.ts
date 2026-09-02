import { mkdir, realpath, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { BrowserWindow, app } from 'electron'
import { handle, push } from '../ipc/ipc'
import { workspaceDir } from '../shell/workspace-dir/workspace-dir'
import { recallProject } from '../store/project-memory/project-memory'
import { libraryOpenToAgents, setLibraryOpenToAgents } from './library-access/library-access'
import { libraryDbFile, openLibraryDb } from './library-db/library-db'
import { backlinksTo, recentNotes, searchNotes } from './library-find/library-find'
import { importOldNotes } from './library-import/library-import'
import { mcpConfigFor, startLibraryMcp } from './library-mcp/library-mcp'
import type { LibraryMcp, LibraryTools } from './library-mcp/library-mcp.types'
import {
  acceptProposal,
  addProposal,
  dismissProposal,
  listProposals,
} from './library-proposals/library-proposals'
import {
  addFolder,
  createNote,
  fileNote,
  isFolderName,
  listNotes,
  readNote,
  removeFolder,
  removeNote,
  renameFolder,
  renameNote,
  writeNote,
} from './library-notes/library-notes'

// Earlier versions kept a derived search index and a written MCP config of
// their own beside the app's files. Neither is written any more.
const OLD_DIRS = ['library-index', 'library-mcp']

const libraries = new Map<string, DatabaseSync>()
const opening = new Map<string, Promise<DatabaseSync>>()

function tellRenderers(): void {
  for (const win of BrowserWindow.getAllWindows()) push(win.webContents, 'library:changed', null)
}

// A suggestion is not a change to the library, so it gets a word of its own:
// the card goes up, the notes stay as they were.
function tellProposed(): void {
  for (const win of BrowserWindow.getAllWindows()) push(win.webContents, 'library:proposed', null)
}

// Nothing happened when nothing was written, so the windows are left alone.
function told<T>(value: T): T {
  if (value !== null) tellRenderers()
  return value
}

async function sweepOldFiles(): Promise<void> {
  await Promise.all(
    OLD_DIRS.map((name) =>
      rm(join(app.getPath('userData'), name), { recursive: true, force: true }).catch(
        () => undefined,
      ),
    ),
  )
}

// The notes are in the file, so one that will not open is kept rather than
// deleted: a person can hand it to something that reads SQLite, and the app
// carries on with a library that opens. Each keepsake is dated, so a second
// accident never writes over the first.
async function keepAside(file: string, atMs: number): Promise<void> {
  for (const part of ['', '-wal', '-shm']) {
    await rename(`${file}${part}`, `${file}.broken-${atMs}${part}`).catch(() => undefined)
  }
}

// SQLITE_CORRUPT and SQLITE_NOTADB: the bytes are not a database. Anything
// else, a disk that is full or a file another program is holding, is a reason
// to fail and be asked again, not to start the library over empty.
const NOT_A_DATABASE = new Set([11, 26])

function isRubble(cause: unknown): boolean {
  const code = (cause as { errcode?: unknown } | null)?.errcode
  return typeof code === 'number' && NOT_A_DATABASE.has(code)
}

async function lay(file: string, workspace: string): Promise<DatabaseSync> {
  await mkdir(dirname(file), { recursive: true })
  let db: DatabaseSync
  try {
    db = openLibraryDb(file, workspace)
  } catch (cause: unknown) {
    if (!isRubble(cause)) throw cause
    console.error('[library] the file is not a database, kept it aside', file, cause)
    await keepAside(file, Date.now())
    db = openLibraryDb(file, workspace)
  }
  await importOldNotes(db, workspace).catch((cause: unknown) => {
    console.error('[library] could not take in the notes the project kept as files', cause)
  })
  await sweepOldFiles()
  return db
}

async function fileFor(workspace: string): Promise<{ file: string; real: string }> {
  const real = await realpath(workspace).catch(() => workspace)
  return { file: libraryDbFile(app.getPath('userData'), real), real }
}

async function dbAt(file: string, real: string): Promise<DatabaseSync> {
  const open = libraries.get(file)
  if (open !== undefined) return open
  // Two callers arriving together must not open the file twice.
  let pending = opening.get(file)
  if (pending === undefined) {
    pending = lay(file, real).then((db) => {
      libraries.set(file, db)
      return db
    })
    opening.set(file, pending)
    pending.finally(() => opening.delete(file)).catch(() => undefined)
  }
  return pending
}

async function dbFor(workspace: string): Promise<DatabaseSync> {
  const { file, real } = await fileFor(workspace)
  return dbAt(file, real)
}

export function closeLibraries(): void {
  for (const db of libraries.values()) db.close()
  libraries.clear()
}

// One server per library, so a tool call from a session lands in that session's
// workspace whatever project the screen is showing.
const servers = new Map<string, LibraryMcp>()

function toolsFor(workspace: string): LibraryTools {
  return {
    async search(query, limit) {
      return searchNotes(await dbFor(workspace), query, limit)
    },
    async read(id) {
      return readNote(await dbFor(workspace), id)
    },
    // The library is the person's, so an agent's write only asks. The note is
    // written when the person accepts, and not a moment before.
    async write(input) {
      const folder = input.folder ?? ''
      if (folder.length > 0 && !isFolderName(folder)) return null
      const proposal = addProposal(await dbFor(workspace), { ...input, folder })
      tellProposed()
      return proposal
    },
    async recent(limit) {
      return recentNotes(await dbFor(workspace), limit)
    },
  }
}

async function serverFor(file: string, workspace: string): Promise<LibraryMcp> {
  const running = servers.get(file)
  if (running !== undefined) return running
  const server = await startLibraryMcp(toolsFor(workspace))
  servers.set(file, server)
  return server
}

// What a session is handed so its agent can search and write the library. The
// notes are the app's now, so nothing of the project is opened to it: the tools
// are the whole of it. Nothing at all, when the project has closed its library
// to agents.
export async function librarySessionArgs(workspace: string): Promise<string[]> {
  if (!(await libraryOpenToAgents(workspace))) return []
  const { file, real } = await fileFor(workspace)
  await dbAt(file, real)
  // Sessions end when the project changes, so a server for another library has
  // nobody left to serve.
  await closeServersExcept(file)
  // The CLI takes the MCP config as a JSON string, so nothing is written for it.
  return ['--mcp-config', mcpConfigFor(await serverFor(file, workspace))]
}

async function closeServersExcept(file: string): Promise<void> {
  const others = [...servers.entries()].filter(([held]) => held !== file)
  for (const [held] of others) servers.delete(held)
  await Promise.all(others.map(([, server]) => server.close()))
}

export async function closeLibraryMcp(): Promise<void> {
  const running = [...servers.values()]
  servers.clear()
  await Promise.all(running.map((server) => server.close()))
}

async function currentWorkspace(): Promise<string> {
  return workspaceDir(await recallProject(), app.getPath('userData'))
}

async function currentDb(): Promise<DatabaseSync> {
  return dbFor(await currentWorkspace())
}

export function registerLibrary(): void {
  handle('library:agents', async () => libraryOpenToAgents(await currentWorkspace()))
  handle('library:agents-set', async (_event, open) => {
    if (typeof open !== 'boolean') return libraryOpenToAgents(await currentWorkspace())
    const workspace = await currentWorkspace()
    await setLibraryOpenToAgents(workspace, open)
    return libraryOpenToAgents(workspace)
  })
  handle('library:list', async () => listNotes(await currentDb()))
  handle('library:read', async (_event, id) => readNote(await currentDb(), id))
  handle('library:remove', async (_event, id) => {
    removeNote(await currentDb(), id)
    tellRenderers()
  })
  handle('library:write', async (_event, id, body, patch) =>
    told(writeNote(await currentDb(), id, body, patch ?? {})),
  )
  handle('library:create', async (_event, folder, title) =>
    told(createNote(await currentDb(), folder, title)),
  )
  handle('library:rename', async (_event, id, title) =>
    told(renameNote(await currentDb(), id, title)),
  )
  handle('library:file', async (_event, text) => told(fileNote(await currentDb(), text)))
  handle('library:search', async (_event, query) =>
    typeof query === 'string' ? searchNotes(await currentDb(), query) : [],
  )
  handle('library:backlinks', async (_event, id) => {
    const db = await currentDb()
    const note = readNote(db, id)
    return note === null ? [] : backlinksTo(db, note.title)
  })
  handle('library:proposals', async () => listProposals(await currentDb()))
  handle('library:proposal-accept', async (_event, id) => {
    const note = acceptProposal(await currentDb(), id)
    if (note !== null) tellRenderers()
    tellProposed()
    return note
  })
  handle('library:proposal-dismiss', async (_event, id) => {
    dismissProposal(await currentDb(), id)
    tellProposed()
  })
  handle('library:folder-add', async (_event, name) => told(addFolder(await currentDb(), name)))
  handle('library:folder-rename', async (_event, name, next) =>
    told(renameFolder(await currentDb(), name, next)),
  )
  handle('library:folder-remove', async (_event, name) =>
    told(removeFolder(await currentDb(), name)),
  )
}

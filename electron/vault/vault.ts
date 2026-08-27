import { createHash } from 'node:crypto'
import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { access, mkdir, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BrowserWindow, app } from 'electron'
import { handle, push } from '../ipc/ipc'
import { workspaceDir } from '../shell/workspace-dir/workspace-dir'
import { recallProject } from '../store/project-memory/project-memory'
import { GUIDE_TEXT } from './vault-folders'
import { openVaultIndex } from './vault-index/vault-index'
import type { VaultIndex } from './vault-index/vault-index.types'
import { mcpConfigFor, startVaultMcp } from './vault-mcp/vault-mcp'
import type { VaultMcp, VaultTools } from './vault-mcp/vault-mcp.types'
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
} from './vault-notes/vault-notes'

const MARKER = '.zetrem'
const GUIDE = 'CLAUDE.md'
const SETTLE_MS = 300

// The vault travels with the work: a project's own folder, or the scratch
// workspace when no project is picked.
export function vaultRootFor(workspace: string): string {
  return join(workspace, '.zetrem', 'vault')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function ensureVault(root: string): Promise<void> {
  await mkdir(root, { recursive: true })
  if (await exists(join(root, MARKER))) return
  if (!(await exists(join(root, GUIDE)))) await writeFile(join(root, GUIDE), GUIDE_TEXT, 'utf8')
  await writeFile(join(root, MARKER), '', 'utf8')
}

async function currentRoot(): Promise<string> {
  const workspace = await workspaceDir(await recallProject(), app.getPath('userData'))
  const root = vaultRootFor(workspace)
  await ensureVault(root)
  return root
}

// One derived index per vault, named by where the vault really is.
async function indexKey(root: string): Promise<string> {
  const real = await realpath(root).catch(() => root)
  return createHash('sha1').update(real).digest('hex').slice(0, 16)
}

const indexes = new Map<string, VaultIndex>()
const watchers = new Map<string, FSWatcher>()

function tellRenderers(): void {
  for (const win of BrowserWindow.getAllWindows()) push(win.webContents, 'vault:changed', null)
}

async function indexFor(root: string): Promise<VaultIndex> {
  const key = await indexKey(root)
  let index = indexes.get(key)
  if (index === undefined) {
    const dir = join(app.getPath('userData'), 'vault-index')
    await mkdir(dir, { recursive: true })
    index = openVaultIndex(join(dir, `${key}.sqlite`))
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

// One server per vault, so a tool call from a session lands in that
// session's workspace whatever project the screen is showing.
const servers = new Map<string, { server: VaultMcp; configPath: string }>()

function toolsFor(root: string): VaultTools {
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
      // createNote marks what a person begins; a tool call is the agent's hand.
      return writeNote(root, started.id, input.body, { tags: input.tags ?? [], source: 'agent' })
    },
    async recent(limit) {
      return (await indexFor(root)).recent(limit)
    },
  }
}

async function serverFor(root: string): Promise<{ server: VaultMcp; configPath: string }> {
  const running = servers.get(root)
  if (running !== undefined) return running
  const server = await startVaultMcp(toolsFor(root))
  const dir = join(app.getPath('userData'), 'vault-mcp')
  await mkdir(dir, { recursive: true })
  const configPath = join(dir, `${await indexKey(root)}.json`)
  await writeFile(configPath, mcpConfigFor(server), 'utf8')
  const bound = { server, configPath }
  servers.set(root, bound)
  return bound
}

// What a session is handed so its agent can read the vault as files and
// search it as a tool.
export async function vaultSessionArgs(workspace: string): Promise<string[]> {
  const root = vaultRootFor(workspace)
  await ensureVault(root)
  follow(root)
  const { configPath } = await serverFor(root)
  return ['--add-dir', root, '--mcp-config', configPath]
}

export async function closeVaultMcp(): Promise<void> {
  const running = [...servers.values()]
  servers.clear()
  await Promise.all(running.map(({ server }) => server.close()))
}

export function registerVault(): void {
  handle('vault:list', async () => {
    const root = await currentRoot()
    follow(root)
    void indexFor(root).catch(() => undefined)
    return listNotes(root)
  })
  handle('vault:read', async (_event, id) => readNote(await currentRoot(), id))
  handle('vault:remove', async (_event, id) => removeNote(await currentRoot(), id))
  handle('vault:write', async (_event, id, body, patch) =>
    writeNote(await currentRoot(), id, body, patch ?? {}),
  )
  handle('vault:create', async (_event, folder, title) =>
    createNote(await currentRoot(), folder, title),
  )
  handle('vault:rename', async (_event, id, title) => renameNote(await currentRoot(), id, title))
  handle('vault:file', async (_event, text, session) =>
    fileNote(await currentRoot(), text, session),
  )
  handle('vault:search', async (_event, query) => {
    const root = await currentRoot()
    return (await indexFor(root)).search(query)
  })
  handle('vault:backlinks', async (_event, id) => {
    const root = await currentRoot()
    const note = await readNote(root, id)
    if (note === null) return []
    return (await indexFor(root)).backlinks(note.title)
  })
  handle('vault:folder-add', async (_event, name) => addFolder(await currentRoot(), name))
  handle('vault:folder-rename', async (_event, name, next) =>
    renameFolder(await currentRoot(), name, next),
  )
  handle('vault:folder-remove', async (_event, name) => removeFolder(await currentRoot(), name))
}

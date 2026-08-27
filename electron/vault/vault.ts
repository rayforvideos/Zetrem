import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { handle } from '../ipc/ipc'
import { GUIDE_TEXT } from './vault-folders'
import {
  addFolder,
  createNote,
  listNotes,
  readNote,
  removeFolder,
  removeNote,
  renameFolder,
  renameNote,
  writeNote,
} from './vault-notes/vault-notes'

const MARKER = '.zetrem'
const GUIDE = 'CLAUDE.md'

export function vaultRoot(userData: string = app.getPath('userData')): string {
  return join(userData, 'vault')
}

export function vaultArgs(path: string): string[] {
  return ['--add-dir', path]
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

export function registerVault(): void {
  handle('vault:list', async () => {
    const root = vaultRoot()
    await ensureVault(root)
    return listNotes(root)
  })
  handle('vault:read', (_event, id: unknown) => readNote(vaultRoot(), id))
  handle('vault:remove', (_event, id: unknown) => removeNote(vaultRoot(), id))
  handle('vault:write', (_event, id: unknown, text: unknown) => writeNote(vaultRoot(), id, text))
  handle('vault:create', (_event, folder: unknown, title: unknown) =>
    createNote(vaultRoot(), folder, title),
  )
  handle('vault:rename', (_event, id: unknown, title: unknown) =>
    renameNote(vaultRoot(), id, title),
  )
  handle('vault:folder-add', (_event, name: unknown) => addFolder(vaultRoot(), name))
  handle('vault:folder-rename', (_event, name: unknown, next: unknown) =>
    renameFolder(vaultRoot(), name, next),
  )
  handle('vault:folder-remove', (_event, name: unknown) => removeFolder(vaultRoot(), name))
}

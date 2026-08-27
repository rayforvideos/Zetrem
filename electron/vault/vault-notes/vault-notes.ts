import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import type {
  VaultFolder,
  VaultListing,
  VaultNote,
  VaultNoteSummary,
} from '@/entities/vault/model/note'
import { GUIDE_TEXT } from '../vault-folders'

const GUIDE_ID = 'CLAUDE.md'
const FOLDER_MAX = 60
const TITLE_MAX = 80
const LEAD_MAX = 160
const SEGMENT = /^[^/\\]+$/

export function isFolderName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name === name.trim() &&
    name.length > 0 &&
    name.length <= FOLDER_MAX &&
    SEGMENT.test(name) &&
    !name.includes('..') &&
    !name.startsWith('.') &&
    name !== GUIDE_ID
  )
}

function isTitle(title: unknown): title is string {
  return (
    typeof title === 'string' &&
    title === title.trim() &&
    title.length > 0 &&
    title.length <= TITLE_MAX &&
    SEGMENT.test(title) &&
    !title.includes('..') &&
    !title.startsWith('.')
  )
}

export function isNoteId(id: unknown): id is string {
  if (typeof id !== 'string' || id.includes('..')) return false
  const at = id.indexOf('/')
  if (at <= 0) return false
  const folder = id.slice(0, at)
  const file = id.slice(at + 1)
  return isFolderName(folder) && SEGMENT.test(file) && file.endsWith('.md') && file.length > 3
}

export function isWritableId(id: unknown): id is string {
  return id === GUIDE_ID || isNoteId(id)
}

export function leadOf(text: string): string {
  const line = text.split('\n').find((one) => one.trim().length > 0) ?? ''
  return line.trim().slice(0, LEAD_MAX)
}

async function inside(root: string, id: string): Promise<string | null> {
  try {
    const ground = await realpath(root)
    const path = await realpath(resolve(root, id))
    return path.startsWith(ground + sep) ? path : null
  } catch {
    return null
  }
}

async function isDir(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isDirectory()
  } catch {
    return false
  }
}

async function taken(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

async function target(root: string, id: string): Promise<string | null> {
  const at = id.lastIndexOf('/')
  const folder = at === -1 ? '.' : id.slice(0, at)
  const file = at === -1 ? id : id.slice(at + 1)
  if (!SEGMENT.test(file)) return null
  try {
    const ground = await realpath(root)
    const parent = await realpath(resolve(root, folder))
    if (parent !== ground && !parent.startsWith(ground + sep)) return null
    return join(parent, file)
  } catch {
    return null
  }
}

export async function listFolders(root: string): Promise<VaultFolder[]> {
  let names: string[]
  try {
    names = await readdir(root)
  } catch {
    return []
  }
  const dirs: string[] = []
  for (const name of names) {
    if (!isFolderName(name)) continue
    if (await isDir(join(root, name))) dirs.push(name)
  }
  return dirs.sort((a, b) => a.localeCompare(b)).map((name) => ({ name }))
}

async function summary(
  root: string,
  folder: string,
  name: string,
): Promise<VaultNoteSummary | null> {
  const id = `${folder}/${name}`
  const path = await inside(root, id)
  if (path === null) return null
  try {
    const [info, text] = await Promise.all([stat(path), readFile(path, 'utf8')])
    return {
      id,
      folder,
      title: name.slice(0, -'.md'.length),
      lead: leadOf(text),
      updatedAtMs: Math.round(info.mtimeMs),
    }
  } catch {
    return null
  }
}

export async function listNotes(root: string): Promise<VaultListing> {
  const folders = await listFolders(root)
  const out: VaultNoteSummary[] = []
  for (const { name: folder } of folders) {
    let names: string[]
    try {
      names = await readdir(join(root, folder))
    } catch {
      continue
    }
    const notes = await Promise.all(
      names
        .filter((name) => isNoteId(`${folder}/${name}`))
        .map((name) => summary(root, folder, name)),
    )
    out.push(
      ...notes
        .filter((one): one is VaultNoteSummary => one !== null)
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs),
    )
  }
  return { folders, notes: out }
}

async function restoreGuide(root: string): Promise<string | null> {
  const path = await target(root, GUIDE_ID)
  if (path === null) return null
  try {
    await writeFile(path, GUIDE_TEXT, 'utf8')
  } catch {
    return null
  }
  return inside(root, GUIDE_ID)
}

async function readGuide(root: string): Promise<VaultNote | null> {
  const path = (await inside(root, GUIDE_ID)) ?? (await restoreGuide(root))
  if (path === null) return null
  try {
    const [info, text] = await Promise.all([stat(path), readFile(path, 'utf8')])
    return {
      id: GUIDE_ID,
      folder: '',
      title: GUIDE_ID,
      lead: leadOf(text),
      updatedAtMs: Math.round(info.mtimeMs),
      text,
    }
  } catch {
    return null
  }
}

export async function readNote(root: string, id: unknown): Promise<VaultNote | null> {
  if (id === GUIDE_ID) return readGuide(root)
  if (!isNoteId(id)) return null
  const path = await inside(root, id)
  if (path === null) return null
  const at = id.indexOf('/')
  const head = await summary(root, id.slice(0, at), id.slice(at + 1))
  if (head === null) return null
  try {
    return { ...head, text: await readFile(path, 'utf8') }
  } catch {
    return null
  }
}

export async function writeNote(
  root: string,
  id: unknown,
  text: unknown,
): Promise<VaultNote | null> {
  if (!isWritableId(id) || typeof text !== 'string') return null
  if (id !== GUIDE_ID) {
    const folder = id.slice(0, id.indexOf('/'))
    if (!(await isDir(join(root, folder)))) return null
  }
  const path = await target(root, id)
  if (path === null) return null
  if ((await inside(root, id)) === null && (await taken(path))) return null
  try {
    await writeFile(path, text, 'utf8')
  } catch {
    return null
  }
  return readNote(root, id)
}

async function freeTitle(root: string, folder: string, title: string): Promise<string> {
  let candidate = title
  for (let n = 2; await taken(join(root, folder, `${candidate}.md`)); n += 1) {
    candidate = `${title} ${n}`
  }
  return candidate
}

export async function createNote(
  root: string,
  folder: unknown,
  title: unknown,
): Promise<VaultNote | null> {
  if (!isFolderName(folder) || !isTitle(title)) return null
  if (!(await isDir(join(root, folder)))) return null
  const name = await freeTitle(root, folder, title)
  return writeNote(root, `${folder}/${name}.md`, '')
}

export async function renameNote(
  root: string,
  id: unknown,
  title: unknown,
): Promise<VaultNote | null> {
  if (!isNoteId(id) || !isTitle(title)) return null
  const from = await inside(root, id)
  if (from === null) return null
  const folder = id.slice(0, id.indexOf('/'))
  const next = `${folder}/${title}.md`
  if (next === id) return readNote(root, id)
  const to = await target(root, next)
  if (to === null || (await taken(to))) return null
  try {
    await rename(from, to)
  } catch {
    return null
  }
  return readNote(root, next)
}

export async function removeNote(root: string, id: unknown): Promise<void> {
  if (!isNoteId(id)) return
  const path = await inside(root, id)
  if (path === null) return
  await rm(path, { force: true }).catch(() => undefined)
}

export async function addFolder(root: string, name: unknown): Promise<VaultListing> {
  if (isFolderName(name) && !(await isDir(join(root, name)))) {
    await mkdir(join(root, name)).catch(() => undefined)
  }
  return listNotes(root)
}

export async function renameFolder(
  root: string,
  name: unknown,
  next: unknown,
): Promise<VaultListing> {
  if (isFolderName(name) && isFolderName(next) && name !== next) {
    const from = join(root, name)
    const to = join(root, next)
    if ((await isDir(from)) && !(await taken(to))) {
      await rename(from, to).catch(() => undefined)
    }
  }
  return listNotes(root)
}

export async function removeFolder(root: string, name: unknown): Promise<VaultListing> {
  if (isFolderName(name)) {
    const path = join(root, name)
    if (await isDir(path)) {
      const all = await readdir(path).catch(() => ['?'])
      const left = all.filter((one) => !one.startsWith('.'))
      if (left.length === 0) {
        for (const dot of all) await rm(join(path, dot), { force: true }).catch(() => undefined)
        await rmdir(path).catch(() => undefined)
      }
    }
  }
  return listNotes(root)
}

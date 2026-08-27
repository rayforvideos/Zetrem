import { createHash } from 'node:crypto'
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
import type { NoteMeta } from '@/entities/vault/lib/frontmatter/frontmatter.types'
import { parseNote, serializeNote } from '@/entities/vault/lib/frontmatter/frontmatter'
import { summaryOf, titleFrom } from '@/entities/vault/lib/summary/summary'
import type {
  NoteSource,
  VaultFolder,
  VaultListing,
  VaultNote,
  VaultNoteSummary,
} from '@/entities/vault/model/note'
import { GUIDE_TEXT } from '../vault-folders'
import type { IndexedNote } from '../vault-index/vault-index.types'
import type { NotePatch } from './vault-notes.types'

const GUIDE_ID = 'CLAUDE.md'
const FOLDER_MAX = 60
const TITLE_MAX = 80
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

function isFileName(file: string): boolean {
  return (
    SEGMENT.test(file) &&
    file.endsWith('.md') &&
    file.length > 3 &&
    !file.startsWith('.') &&
    file !== GUIDE_ID
  )
}

export function isNoteId(id: unknown): id is string {
  if (typeof id !== 'string' || id.includes('..') || id.includes('\\')) return false
  const at = id.indexOf('/')
  if (at === -1) return isFileName(id)
  return isFolderName(id.slice(0, at)) && isFileName(id.slice(at + 1))
}

export function isWritableId(id: unknown): id is string {
  return id === GUIDE_ID || isNoteId(id)
}

function split(id: string): { folder: string; file: string } {
  const at = id.indexOf('/')
  return at === -1 ? { folder: '', file: id } : { folder: id.slice(0, at), file: id.slice(at + 1) }
}

function idOf(folder: string, title: string): string {
  return folder.length === 0 ? `${title}.md` : `${folder}/${title}.md`
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

// Where a new file for this id would go, or null when its folder is not a real
// folder inside the vault (a symlink out counts as not inside).
async function target(root: string, id: string): Promise<string | null> {
  const { folder, file } = split(id)
  if (!SEGMENT.test(file)) return null
  try {
    const ground = await realpath(root)
    const parent = await realpath(resolve(root, folder.length === 0 ? '.' : folder))
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

function stamp(iso: string, fallbackMs: number): number {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? Math.round(fallbackMs) : ms
}

function metaOf(text: string, file: string): { meta: NoteMeta; body: string } {
  const parsed = parseNote(text)
  const title = file.slice(0, -'.md'.length)
  if (parsed.meta === null) {
    return {
      meta: {
        title,
        created: '',
        updated: '',
        source: 'person',
        session: null,
        tags: [],
        rest: {},
      },
      body: parsed.body,
    }
  }
  return {
    meta: { ...parsed.meta, title: parsed.meta.title.length > 0 ? parsed.meta.title : title },
    body: parsed.body,
  }
}

async function load(root: string, id: string): Promise<(VaultNote & { text: string }) | null> {
  const path = await inside(root, id)
  if (path === null) return null
  const { folder, file } = split(id)
  try {
    const [info, text] = await Promise.all([stat(path), readFile(path, 'utf8')])
    const { meta, body } = metaOf(text, file)
    return {
      id,
      folder,
      title: meta.title,
      summary: summaryOf(body),
      source: meta.source,
      tags: meta.tags,
      createdAtMs: stamp(meta.created, info.birthtimeMs || info.mtimeMs),
      updatedAtMs: stamp(meta.updated, info.mtimeMs),
      body,
      session: meta.session,
      text,
    }
  } catch {
    return null
  }
}

function summarised(note: VaultNote): VaultNoteSummary {
  const { body: _body, session: _session, ...head } = note
  return head
}

async function idsIn(root: string): Promise<string[]> {
  let names: string[]
  try {
    names = await readdir(root)
  } catch {
    return []
  }
  const ids = names.filter((name) => isNoteId(name))
  for (const { name: folder } of await listFolders(root)) {
    const inner = await readdir(join(root, folder)).catch(() => [] as string[])
    ids.push(...inner.map((name) => `${folder}/${name}`).filter((id) => isNoteId(id)))
  }
  return ids
}

async function loadAll(root: string): Promise<(VaultNote & { text: string })[]> {
  const loaded = await Promise.all((await idsIn(root)).map((id) => load(root, id)))
  return loaded
    .filter((one): one is VaultNote & { text: string } => one !== null)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
}

export async function listNotes(root: string): Promise<VaultListing> {
  const [folders, notes] = await Promise.all([listFolders(root), loadAll(root)])
  return { folders, notes: notes.map(summarised) }
}

// Everything the index needs, with a hash so an unchanged file costs it nothing.
export async function notesForIndex(root: string): Promise<IndexedNote[]> {
  return (await loadAll(root)).map(({ text, ...note }) => ({
    ...note,
    hash: createHash('sha1').update(text).digest('hex'),
  }))
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
      summary: summaryOf(text),
      source: 'person',
      tags: [],
      createdAtMs: Math.round(info.birthtimeMs || info.mtimeMs),
      updatedAtMs: Math.round(info.mtimeMs),
      body: text,
      session: null,
    }
  } catch {
    return null
  }
}

export async function readNote(root: string, id: unknown): Promise<VaultNote | null> {
  if (id === GUIDE_ID) return readGuide(root)
  if (!isNoteId(id)) return null
  const loaded = await load(root, id)
  if (loaded === null) return null
  const { text: _text, ...note } = loaded
  return note
}

async function put(root: string, id: string, text: string): Promise<VaultNote | null> {
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

// A person's edit: the body changes, the head keeps who wrote it and when it
// began, and only `updated` moves.
export async function writeNote(
  root: string,
  id: unknown,
  body: unknown,
  patch: NotePatch = {},
  nowMs: number = Date.now(),
): Promise<VaultNote | null> {
  if (!isWritableId(id) || typeof body !== 'string') return null
  if (id === GUIDE_ID) return put(root, id, body)
  const { folder, file } = split(id)
  if (folder.length > 0 && !(await isDir(join(root, folder)))) return null
  const existing = await load(root, id)
  const head = existing === null ? metaOf('', file).meta : metaOf(existing.text, file).meta
  const meta: NoteMeta = {
    ...head,
    title: patch.title ?? head.title,
    tags: patch.tags ?? head.tags,
    source: patch.source ?? head.source,
    created: head.created.length > 0 ? head.created : new Date(nowMs).toISOString(),
    updated: new Date(nowMs).toISOString(),
  }
  return put(root, id, serializeNote(meta, body))
}

async function freeTitle(root: string, folder: string, title: string): Promise<string> {
  let candidate = title
  for (let n = 2; await taken(join(root, folder, `${candidate}.md`)); n += 1) {
    candidate = `${title} ${n}`
  }
  return candidate
}

async function begin(
  root: string,
  folder: string,
  title: string,
  body: string,
  source: NoteSource,
  session: string | null,
  nowMs: number,
): Promise<VaultNote | null> {
  if (folder.length > 0 && !(await isDir(join(root, folder)))) return null
  const name = await freeTitle(root, folder, title)
  const at = new Date(nowMs).toISOString()
  const meta: NoteMeta = {
    title: name,
    created: at,
    updated: at,
    source,
    session,
    tags: [],
    rest: {},
  }
  return put(root, idOf(folder, name), serializeNote(meta, body))
}

export async function createNote(
  root: string,
  folder: unknown,
  title: unknown,
  nowMs: number = Date.now(),
): Promise<VaultNote | null> {
  const where = folder === null || folder === '' ? '' : folder
  if ((where !== '' && !isFolderName(where)) || !isTitle(title)) return null
  return begin(root, where, title, '', 'person', null, nowMs)
}

// The bolt on an answer: the answer becomes a note at the root, titled from
// its own words, marked as the agent's and stamped with the session.
export async function fileNote(
  root: string,
  text: unknown,
  session: unknown,
  nowMs: number = Date.now(),
): Promise<VaultNote | null> {
  if (typeof text !== 'string' || text.trim().length === 0) return null
  const who = typeof session === 'string' && session.length > 0 ? session : null
  return begin(root, '', titleFrom(text), text.trim(), 'agent', who, nowMs)
}

export async function renameNote(
  root: string,
  id: unknown,
  title: unknown,
  nowMs: number = Date.now(),
): Promise<VaultNote | null> {
  if (!isNoteId(id) || !isTitle(title)) return null
  const existing = await load(root, id)
  if (existing === null) return null
  const { folder, file } = split(id)
  const next = idOf(folder, title)
  if (next !== id) {
    const to = await target(root, next)
    if (to === null || (await taken(to))) return null
    try {
      await rename(join(root, id), to)
    } catch {
      return null
    }
  }
  const { meta, body } = metaOf(existing.text, file)
  return put(
    root,
    next,
    serializeNote({ ...meta, title, updated: new Date(nowMs).toISOString() }, body),
  )
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

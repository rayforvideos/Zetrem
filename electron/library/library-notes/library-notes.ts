import type { DatabaseSync } from 'node:sqlite'
import { summaryOf, titleFrom } from '@/entities/library/lib/summary/summary'
import type { LibraryListing, LibraryNote } from '@/entities/library/model/note'
import type { FolderRow, NoteRow } from '../library-db/library-db.types'
import { dropNote, headOf, noteOf, putNote, replaceNote } from '../library-db/library-db'
import type { NotePatch } from './library-notes.types'

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
    !name.startsWith('.')
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
    !title.startsWith('.') &&
    // A note is still named as a file would be, and 'x.' would end 'x..md'.
    !title.endsWith('.')
  )
}

function isFileName(file: string): boolean {
  return SEGMENT.test(file) && file.endsWith('.md') && file.length > 3 && !file.startsWith('.')
}

// An id keeps the shape a file had: 'one.md', or 'folder/one.md'. Nothing on
// disk answers to it any more, but every note written before this version has
// one, and a person reading a search result knows what it means.
export function isNoteId(id: unknown): id is string {
  if (typeof id !== 'string' || id.includes('..') || id.includes('\\')) return false
  const at = id.indexOf('/')
  if (at === -1) return isFileName(id)
  return isFolderName(id.slice(0, at)) && isFileName(id.slice(at + 1))
}

function split(id: string): { folder: string; file: string } {
  const at = id.indexOf('/')
  return at === -1 ? { folder: '', file: id } : { folder: id.slice(0, at), file: id.slice(at + 1) }
}

function idOf(folder: string, title: string): string {
  return folder.length === 0 ? `${title}.md` : `${folder}/${title}.md`
}

function rowOf(db: DatabaseSync, id: string): NoteRow | null {
  return (db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined) ?? null
}

function hasFolder(db: DatabaseSync, name: string): boolean {
  return db.prepare('SELECT name FROM folders WHERE name = ?').get(name) !== undefined
}

function taken(db: DatabaseSync, id: string): boolean {
  return db.prepare('SELECT id FROM notes WHERE id = ?').get(id) !== undefined
}

export function listNotes(db: DatabaseSync): LibraryListing {
  const folders = (db.prepare('SELECT name FROM folders').all() as FolderRow[])
    .map((row) => ({ name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const rows = db.prepare('SELECT * FROM notes ORDER BY updated_at_ms DESC, id ASC').all()
  return { folders, notes: (rows as NoteRow[]).map(headOf) }
}

export function readNote(db: DatabaseSync, id: unknown): LibraryNote | null {
  if (!isNoteId(id)) return null
  const row = rowOf(db, id)
  return row === null ? null : noteOf(row)
}

function keep(db: DatabaseSync, note: LibraryNote): LibraryNote {
  putNote(db, note)
  return note
}

// The body changes, the head keeps when the note began, and only `updated` moves.
export function writeNote(
  db: DatabaseSync,
  id: unknown,
  body: unknown,
  patch: NotePatch = {},
  nowMs: number = Date.now(),
): LibraryNote | null {
  if (!isNoteId(id) || typeof body !== 'string') return null
  const { folder, file } = split(id)
  if (folder.length > 0 && !hasFolder(db, folder)) return null
  const was = rowOf(db, id)
  const head = was === null ? null : noteOf(was)
  return keep(db, {
    id,
    folder,
    title: patch.title ?? head?.title ?? file.slice(0, -'.md'.length),
    summary: summaryOf(body),
    tags: patch.tags ?? head?.tags ?? [],
    source: patch.source ?? head?.source ?? '',
    createdAtMs: head?.createdAtMs ?? nowMs,
    updatedAtMs: nowMs,
    body,
  })
}

function freeTitle(db: DatabaseSync, folder: string, title: string): string {
  let candidate = title
  for (let n = 2; taken(db, idOf(folder, candidate)); n += 1) candidate = `${title} ${n}`
  return candidate
}

function begin(
  db: DatabaseSync,
  folder: string,
  title: string,
  body: string,
  nowMs: number,
): LibraryNote | null {
  if (folder.length > 0 && !hasFolder(db, folder)) return null
  const name = freeTitle(db, folder, title)
  // Nothing may be written under an id that cannot be read back: a note only
  // its own writer can name is a note nobody can open or remove.
  if (!isNoteId(idOf(folder, name))) return null
  return keep(db, {
    id: idOf(folder, name),
    folder,
    title: name,
    summary: summaryOf(body),
    tags: [],
    source: '',
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    body,
  })
}

export function createNote(
  db: DatabaseSync,
  folder: unknown,
  title: unknown,
  nowMs: number = Date.now(),
): LibraryNote | null {
  const where = folder === null || folder === '' ? '' : folder
  if ((where !== '' && !isFolderName(where)) || !isTitle(title)) return null
  return begin(db, where, title, '', nowMs)
}

// Words become a title the library can name a note by. An answer that opens
// with '.env' or ends in a full stop still has to land somewhere openable.
function named(text: string): string {
  const plain = titleFrom(text)
    .replace(/\.+/g, '.')
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '')
  return isTitle(plain) ? plain : 'Untitled'
}

// The bolt on an answer: the answer becomes a note at the root, titled from
// its own words.
export function fileNote(
  db: DatabaseSync,
  text: unknown,
  nowMs: number = Date.now(),
): LibraryNote | null {
  if (typeof text !== 'string' || text.trim().length === 0) return null
  return begin(db, '', named(text), text.trim(), nowMs)
}

export function renameNote(
  db: DatabaseSync,
  id: unknown,
  title: unknown,
  nowMs: number = Date.now(),
): LibraryNote | null {
  if (!isNoteId(id) || !isTitle(title)) return null
  const row = rowOf(db, id)
  if (row === null) return null
  const was = noteOf(row)
  const next = idOf(was.folder, title)
  if (next !== id && taken(db, next)) return null
  const moved = { ...was, id: next, title, updatedAtMs: nowMs }
  replaceNote(db, id, moved)
  return moved
}

export function removeNote(db: DatabaseSync, id: unknown): void {
  if (isNoteId(id)) dropNote(db, id)
}

export function addFolder(db: DatabaseSync, name: unknown): LibraryListing {
  if (isFolderName(name)) {
    db.prepare('INSERT INTO folders (name) VALUES (?) ON CONFLICT (name) DO NOTHING').run(name)
  }
  return listNotes(db)
}

export function renameFolder(db: DatabaseSync, name: unknown, next: unknown): LibraryListing {
  if (isFolderName(name) && isFolderName(next) && name !== next && !hasFolder(db, next)) {
    const rows = db.prepare('SELECT * FROM notes WHERE folder = ?').all(name) as NoteRow[]
    db.exec('BEGIN')
    try {
      db.prepare('UPDATE folders SET name = ? WHERE name = ?').run(next, name)
      for (const row of rows) {
        const was = noteOf(row)
        replaceNote(db, was.id, { ...was, folder: next, id: `${next}/${split(was.id).file}` })
      }
      db.exec('COMMIT')
    } catch (cause: unknown) {
      db.exec('ROLLBACK')
      throw cause
    }
  }
  return listNotes(db)
}

// A folder with notes still in it stays: emptying it is the person's to do.
export function removeFolder(db: DatabaseSync, name: unknown): LibraryListing {
  if (isFolderName(name)) {
    const held = db.prepare('SELECT id FROM notes WHERE folder = ? LIMIT 1').get(name)
    if (held === undefined) db.prepare('DELETE FROM folders WHERE name = ?').run(name)
  }
  return listNotes(db)
}

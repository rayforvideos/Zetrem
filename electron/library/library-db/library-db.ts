import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { summaryOf } from '@/entities/library/lib/summary/summary'
import type { LibraryNote, LibraryNoteSummary } from '@/entities/library/model/note'
import type { NoteRow } from './library-db.types'

const SCHEMA_VERSION = '1'
const NAME_MAX = 40
const HASH_CHARS = 8
// What Windows will not take in a file name, and the control characters no
// platform wants in one.
// biome-ignore lint/suspicious/noControlCharactersInRegex: a file name may not carry these
const AWKWARD = /[<>:"/\\|?*\u0000-\u001f]/g

const CODE = /(```[\s\S]*?```|`[^`\n]*`)/g
const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS folders (name TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    folder TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tags TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS notes_folder ON notes (folder);
  CREATE TABLE IF NOT EXISTS links (from_id TEXT NOT NULL, to_title TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS links_to_title ON links (to_title);
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5 (id UNINDEXED, title, body, tags);
`

export function linkTargets(body: string): string[] {
  const out = new Set<string>()
  for (const [at, part] of body.split(CODE).entries()) {
    if (at % 2 === 1) continue
    for (const match of part.matchAll(LINK)) out.add((match[1] as string).trim())
  }
  return [...out]
}

// The file wears the project's own name, so a person looking at the folder can
// see whose library is whose, and carries a short hash of where the project
// really is, so two folders of the same name never land on one file.
export function libraryDbFile(userData: string, workspace: string): string {
  const plain = basename(workspace)
    .replace(AWKWARD, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
  const cut = [...plain]
    .slice(0, NAME_MAX)
    .join('')
    .replace(/[. ]+$/, '')
  const short = createHash('sha1').update(workspace).digest('hex').slice(0, HASH_CHARS)
  return join(userData, 'library', `${cut.length === 0 ? 'library' : cut}-${short}.sqlite`)
}

// The rows are the notes themselves, so a version that finds a stamp it does
// not know leaves everything where it is: dropping a table here would throw
// away the work rather than a cache of it.
function lay(db: DatabaseSync, workspace: string): void {
  db.exec(SCHEMA)
  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('schema_version', ?)
     ON CONFLICT (key) DO NOTHING`,
  ).run(SCHEMA_VERSION)
  // Where the project was when the library was last opened, so a person whose
  // folder has moved can tell which file belonged to it.
  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('workspace', ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(workspace)
}

export function openLibraryDb(file: string, workspace: string): DatabaseSync {
  const db = new DatabaseSync(file)
  try {
    db.exec('PRAGMA journal_mode = WAL')
    lay(db, workspace)
  } catch (cause: unknown) {
    // The handle is released before the error leaves: Windows will not let a
    // file that is still open be moved aside.
    db.close()
    throw cause
  }
  return db
}

function tagsOf(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((one) => typeof one === 'string') : []
  } catch {
    return []
  }
}

export function noteOf(row: NoteRow): LibraryNote {
  return {
    id: row.id,
    folder: row.folder,
    title: row.title,
    summary: summaryOf(row.body),
    tags: tagsOf(row.tags),
    source: row.source,
    createdAtMs: row.created_at_ms,
    updatedAtMs: row.updated_at_ms,
    body: row.body,
  }
}

export function headOf(row: NoteRow): LibraryNoteSummary {
  const { body: _body, ...head } = noteOf(row)
  return head
}

export function dropNote(db: DatabaseSync, id: string): void {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  db.prepare('DELETE FROM links WHERE from_id = ?').run(id)
  db.prepare('DELETE FROM notes_fts WHERE id = ?').run(id)
}

export function putNote(db: DatabaseSync, note: LibraryNote): void {
  dropNote(db, note.id)
  db.prepare(
    `INSERT INTO notes (id, folder, title, body, tags, source, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    note.id,
    note.folder,
    note.title,
    note.body,
    JSON.stringify(note.tags),
    note.source,
    note.createdAtMs,
    note.updatedAtMs,
  )
  const link = db.prepare('INSERT INTO links (from_id, to_title) VALUES (?, ?)')
  for (const title of linkTargets(note.body)) link.run(note.id, title)
  db.prepare('INSERT INTO notes_fts (id, title, body, tags) VALUES (?, ?, ?, ?)').run(
    note.id,
    note.title,
    note.body,
    note.tags.join(' '),
  )
}

import { DatabaseSync } from 'node:sqlite'
import type { LibraryHit, LibraryNoteSummary } from '@/entities/library/model/note'
import type { IndexedNote, LibraryIndex } from './library-index.types'

const SCHEMA_VERSION = '3'
const DEFAULT_LIMIT = 20

const CODE = /(```[\s\S]*?```|`[^`\n]*`)/g
const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

const SCHEMA = `
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    folder TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    tags TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    hash TEXT NOT NULL
  );
  CREATE TABLE links (from_id TEXT NOT NULL, to_title TEXT NOT NULL);
  CREATE INDEX links_to_title ON links (to_title);
  CREATE VIRTUAL TABLE notes_fts USING fts5 (id UNINDEXED, title, body, tags);
`

type Row = {
  id: string
  folder: string
  title: string
  summary: string
  tags: string
  source: string
  created_at_ms: number
  updated_at_ms: number
}

type HitRow = Row & { snippet: string }

export function linkTargets(body: string): string[] {
  const out = new Set<string>()
  for (const [at, part] of body.split(CODE).entries()) {
    if (at % 2 === 1) continue
    for (const match of part.matchAll(LINK)) out.add((match[1] as string).trim())
  }
  return [...out]
}

export function ftsQuery(query: string): string | null {
  const words = query.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) return null
  const quoted = words.map((word) => `"${word.replace(/"/g, '""')}"`)
  quoted[quoted.length - 1] += '*'
  return quoted.join(' AND ')
}

function summaryOf(row: Row): LibraryNoteSummary {
  return {
    id: row.id,
    folder: row.folder,
    title: row.title,
    summary: row.summary,
    tags: JSON.parse(row.tags) as string[],
    source: row.source,
    createdAtMs: row.created_at_ms,
    updatedAtMs: row.updated_at_ms,
  }
}

function schemaVersionOf(db: DatabaseSync): string | null {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meta'")
    .get()
  if (!table) return null
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function dropAll(db: DatabaseSync): void {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table') AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
  // FTS5 shadow tables go with their virtual table; dropping them first fails.
  const own = rows.map((row) => row.name).filter((name) => !name.startsWith('notes_fts_'))
  for (const name of own) db.exec(`DROP TABLE IF EXISTS "${name}"`)
}

function migrate(db: DatabaseSync): void {
  if (schemaVersionOf(db) === SCHEMA_VERSION) return
  dropAll(db)
  db.exec(SCHEMA)
  db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?)").run(SCHEMA_VERSION)
}

export function openLibraryIndex(file: string): LibraryIndex {
  const db = new DatabaseSync(file)
  try {
    db.exec('PRAGMA journal_mode = WAL')
    migrate(db)
  } catch (cause: unknown) {
    // The handle is released before the error leaves: Windows will not let
    // a file that is still open be removed and rebuilt.
    db.close()
    throw cause
  }

  const hashes = db.prepare('SELECT id, hash FROM notes')
  const removeNote = db.prepare('DELETE FROM notes WHERE id = ?')
  const removeLinks = db.prepare('DELETE FROM links WHERE from_id = ?')
  const removeFts = db.prepare('DELETE FROM notes_fts WHERE id = ?')
  const putNote = db.prepare(
    `INSERT INTO notes (id, folder, title, summary, tags, source, created_at_ms, updated_at_ms, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const putLink = db.prepare('INSERT INTO links (from_id, to_title) VALUES (?, ?)')
  const putFts = db.prepare('INSERT INTO notes_fts (id, title, body, tags) VALUES (?, ?, ?, ?)')
  const hits = db.prepare(
    `SELECT n.*, snippet(notes_fts, 2, '', '', '…', 12) AS snippet
     FROM notes_fts JOIN notes n ON n.id = notes_fts.id
     WHERE notes_fts MATCH ? ORDER BY bm25(notes_fts) LIMIT ?`,
  )
  const latest = db.prepare('SELECT * FROM notes ORDER BY updated_at_ms DESC LIMIT ?')
  const linkers = db.prepare(
    `SELECT DISTINCT n.* FROM links JOIN notes n ON n.id = links.from_id
     WHERE links.to_title = ? ORDER BY n.updated_at_ms DESC`,
  )

  function remove(id: string): void {
    removeNote.run(id)
    removeLinks.run(id)
    removeFts.run(id)
  }

  function put(note: IndexedNote): void {
    remove(note.id)
    putNote.run(
      note.id,
      note.folder,
      note.title,
      note.summary,
      JSON.stringify(note.tags),
      note.source,
      note.createdAtMs,
      note.updatedAtMs,
      note.hash,
    )
    for (const title of linkTargets(note.body)) putLink.run(note.id, title)
    putFts.run(note.id, note.title, note.body, note.tags.join(' '))
  }

  function sync(notes: IndexedNote[]): void {
    const known = new Map<string, string>()
    for (const row of hashes.all() as { id: string; hash: string }[]) known.set(row.id, row.hash)
    const wanted = new Set(notes.map((note) => note.id))
    db.exec('BEGIN')
    try {
      for (const id of known.keys()) if (!wanted.has(id)) remove(id)
      for (const note of notes) if (known.get(note.id) !== note.hash) put(note)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  function search(query: string, limit = DEFAULT_LIMIT): LibraryHit[] {
    const match = ftsQuery(query)
    if (match === null) return []
    try {
      const rows = hits.all(match, limit) as HitRow[]
      return rows.map((row) => ({ ...summaryOf(row), snippet: row.snippet }))
    } catch {
      return []
    }
  }

  function recent(limit = DEFAULT_LIMIT): LibraryNoteSummary[] {
    return (latest.all(limit) as Row[]).map(summaryOf)
  }

  function backlinks(title: string): LibraryNoteSummary[] {
    return (linkers.all(title) as Row[]).map(summaryOf)
  }

  return { sync, search, recent, backlinks, close: () => db.close() }
}

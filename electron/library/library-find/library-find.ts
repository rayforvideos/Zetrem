import type { DatabaseSync } from 'node:sqlite'
import type { LibraryHit, LibraryNoteSummary } from '@/entities/library/model/note'
import type { NoteRow } from '../library-db/library-db.types'
import { headOf } from '../library-db/library-db'
import type { HitRow } from './library-find.types'

const DEFAULT_LIMIT = 20

export function ftsQuery(query: string): string | null {
  const words = query.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) return null
  const quoted = words.map((word) => `"${word.replace(/"/g, '""')}"`)
  quoted[quoted.length - 1] += '*'
  return quoted.join(' AND ')
}

export function searchNotes(db: DatabaseSync, query: string, limit = DEFAULT_LIMIT): LibraryHit[] {
  const match = ftsQuery(query)
  if (match === null) return []
  try {
    const rows = db
      .prepare(
        `SELECT n.*, snippet(notes_fts, 2, '', '', '…', 12) AS snippet
         FROM notes_fts JOIN notes n ON n.id = notes_fts.id
         WHERE notes_fts MATCH ? ORDER BY bm25(notes_fts) LIMIT ?`,
      )
      .all(match, limit) as HitRow[]
    return rows.map((row) => ({ ...headOf(row), snippet: row.snippet }))
  } catch {
    // A query FTS5 will not parse is a person still typing, not a fault.
    return []
  }
}

export function recentNotes(db: DatabaseSync, limit = DEFAULT_LIMIT): LibraryNoteSummary[] {
  const rows = db
    .prepare('SELECT * FROM notes ORDER BY updated_at_ms DESC, id ASC LIMIT ?')
    .all(limit) as NoteRow[]
  return rows.map(headOf)
}

export function backlinksTo(db: DatabaseSync, title: string): LibraryNoteSummary[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT n.* FROM links JOIN notes n ON n.id = links.from_id
       WHERE links.to_title = ? ORDER BY n.updated_at_ms DESC, n.id ASC`,
    )
    .all(title) as NoteRow[]
  return rows.map(headOf)
}

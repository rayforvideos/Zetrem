import type { DatabaseSync } from 'node:sqlite'
import type { LibraryHit, LibraryNoteSummary } from '@/entities/library/model/note'
import type { NoteRow } from '../library-db/library-db.types'
import { headOf } from '../library-db/library-db'
import type { HitRow } from './library-find.types'

const DEFAULT_LIMIT = 20

// Every word gets a prefix, not only the last. Korean glues its particles onto
// the end of a word, so a note holds no bare token for an exact match to find
// and the search misses it; the prefix also carries a word half typed.
export function ftsQuery(query: string, join: 'AND' | 'OR' = 'AND'): string | null {
  const words = query.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) return null
  return words.map((word) => `"${word.replace(/"/g, '""')}"*`).join(` ${join} `)
}

export function searchNotes(db: DatabaseSync, query: string, limit = DEFAULT_LIMIT): LibraryHit[] {
  const words = query.split(/\s+/).filter((word) => word.length > 0)
  const hits = matching(db, ftsQuery(query), limit)
  // Notes holding every word come first. Only when there are none does a phrase
  // of several words fall back to the notes holding any of them, so that a
  // question worded a little wide still lands somewhere.
  if (hits.length > 0 || words.length < 2) return hits
  return matching(db, ftsQuery(query, 'OR'), limit)
}

function matching(db: DatabaseSync, match: string | null, limit: number): LibraryHit[] {
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

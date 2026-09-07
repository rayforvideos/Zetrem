import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { LibraryNote } from '@/entities/library/model/note'
import type { LibraryProposal } from '@/entities/library/model/proposal'
import { atLeastAtOnce, tagsOf } from '../library-db/library-db'
import type { ProposalRow } from '../library-db/library-db.types'
import { createNote, isFolderName, writeNote } from '../library-notes/library-notes'
import type { ProposalInput } from './library-proposals.types'

// The library is the person's. An agent's write lands here instead, and waits.
// Nothing in this file touches the notes until `acceptProposal` is called.

function proposalOf(row: ProposalRow): LibraryProposal {
  return {
    id: row.id,
    folder: row.folder,
    title: row.title,
    body: row.body,
    tags: tagsOf(row.tags),
    proposedAtMs: row.proposed_at_ms,
    session: row.session,
    by: row.by,
  }
}

function rowOf(db: DatabaseSync, id: string): ProposalRow | null {
  return (
    (db.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as ProposalRow | undefined) ?? null
  )
}

// Oldest first: the one that has waited longest is the one to answer.
export function listProposals(db: DatabaseSync): LibraryProposal[] {
  const rows = db
    .prepare('SELECT * FROM proposals ORDER BY proposed_at_ms ASC, id ASC')
    .all() as ProposalRow[]
  return rows.map(proposalOf)
}

// The same suggestion already waiting, or null. A run that reaches one
// conclusion twice, or two teammates that reach it apart from each other,
// should cost the person one answer rather than a row of identical cards.
function twinOf(db: DatabaseSync, input: ProposalInput, folder: string): LibraryProposal | null {
  const row = db
    .prepare(
      `SELECT * FROM proposals WHERE folder = ? AND title = ? AND body = ?
       ORDER BY proposed_at_ms ASC, id ASC LIMIT 1`,
    )
    .get(folder, input.title, input.body) as ProposalRow | undefined
  return row === undefined ? null : proposalOf(row)
}

export function addProposal(
  db: DatabaseSync,
  input: ProposalInput,
  nowMs: number = Date.now(),
): LibraryProposal {
  const folder = input.folder ?? ''
  // Answering the first one answers this one too, so the ask that arrived
  // first is the one that stays and the second is told it is already waiting.
  const waiting = twinOf(db, input, folder)
  if (waiting !== null) return waiting
  const proposal: LibraryProposal = {
    id: randomUUID(),
    folder,
    title: input.title,
    body: input.body,
    tags: input.tags ?? [],
    proposedAtMs: nowMs,
    session: input.session,
    by: input.by,
  }
  db.prepare(
    `INSERT INTO proposals (id, folder, title, body, tags, proposed_at_ms, session, by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    proposal.id,
    proposal.folder,
    proposal.title,
    proposal.body,
    JSON.stringify(proposal.tags),
    proposal.proposedAtMs,
    proposal.session,
    proposal.by,
  )
  return proposal
}

function words(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// A proposal handed back over IPC is whatever the screen sent, so it is read
// rather than trusted. Everything the library decides for itself is decided
// again here; only the id is kept, so undoing twice cannot leave two copies.
function readProposal(given: unknown): LibraryProposal | null {
  if (typeof given !== 'object' || given === null) return null
  const source = given as Record<string, unknown>
  if (typeof source.id !== 'string' || source.id.length === 0) return null
  if (typeof source.title !== 'string' || source.title.length === 0) return null
  if (typeof source.body !== 'string') return null
  const tags = Array.isArray(source.tags)
    ? source.tags.filter((one) => typeof one === 'string')
    : []
  const proposedAtMs =
    typeof source.proposedAtMs === 'number' && Number.isFinite(source.proposedAtMs)
      ? source.proposedAtMs
      : Date.now()
  return {
    id: source.id,
    folder: words(source.folder),
    title: source.title,
    body: source.body,
    tags,
    proposedAtMs,
    session: words(source.session),
    by: words(source.by),
  }
}

// Undoing an accept. The note the accept wrote is removed by the library's own
// remove; this is the other half, putting the suggestion back where it waited
// so nothing about the moment before the accept is lost. It goes back under
// the id it had, so an undo that somehow runs twice still leaves one card.
export function restoreProposal(db: DatabaseSync, given: unknown): LibraryProposal | null {
  const asked = readProposal(given)
  if (asked === null) return null
  if (asked.folder.length > 0 && !isFolderName(asked.folder)) return null
  db.prepare(
    `INSERT INTO proposals (id, folder, title, body, tags, proposed_at_ms, session, by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
  ).run(
    asked.id,
    asked.folder,
    asked.title,
    asked.body,
    JSON.stringify(asked.tags),
    asked.proposedAtMs,
    asked.session,
    asked.by,
  )
  return rowOf(db, asked.id) === null ? null : asked
}

export function dismissProposal(db: DatabaseSync, id: unknown): void {
  if (typeof id === 'string') db.prepare('DELETE FROM proposals WHERE id = ?').run(id)
}

// The note is written now, on the person's word, exactly as the agent's tool
// used to write it. A proposal the library will not take stays where it is, so
// nothing is lost to a folder that was renamed while it waited.
//
// The three steps — starting the note, writing its body, and dropping the
// proposal — are one change: a crash between them must not leave an empty
// note behind with its proposal still waiting, as if nothing had happened.
export function acceptProposal(db: DatabaseSync, id: unknown, locale?: string): LibraryNote | null {
  if (typeof id !== 'string') return null
  const row = rowOf(db, id)
  if (row === null) return null
  const asked = proposalOf(row)
  if (asked.folder.length > 0 && !isFolderName(asked.folder)) return null
  let note: LibraryNote | null = null
  atLeastAtOnce(db, () => {
    const started = createNote(db, asked.folder, asked.title, Date.now(), locale)
    if (started === null) return
    note = writeNote(db, started.id, asked.body, { tags: asked.tags, source: 'agent' })
    if (note === null) return
    dismissProposal(db, id)
  })
  return note
}

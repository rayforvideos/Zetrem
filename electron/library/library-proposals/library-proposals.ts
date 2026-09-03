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

export function addProposal(
  db: DatabaseSync,
  input: ProposalInput,
  nowMs: number = Date.now(),
): LibraryProposal {
  const proposal: LibraryProposal = {
    id: randomUUID(),
    folder: input.folder ?? '',
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
export function acceptProposal(db: DatabaseSync, id: unknown): LibraryNote | null {
  if (typeof id !== 'string') return null
  const row = rowOf(db, id)
  if (row === null) return null
  const asked = proposalOf(row)
  if (asked.folder.length > 0 && !isFolderName(asked.folder)) return null
  let note: LibraryNote | null = null
  atLeastAtOnce(db, () => {
    const started = createNote(db, asked.folder, asked.title)
    if (started === null) return
    note = writeNote(db, started.id, asked.body, { tags: asked.tags, source: 'agent' })
    if (note === null) return
    dismissProposal(db, id)
  })
  return note
}

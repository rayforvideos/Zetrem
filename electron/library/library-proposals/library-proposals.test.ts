import type { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openLibraryDb } from '../library-db/library-db'
import { addFolder, listNotes } from '../library-notes/library-notes'
import { acceptProposal, addProposal, dismissProposal, listProposals } from './library-proposals'

let db: DatabaseSync
const NOW = Date.parse('2026-08-28T03:00:00.000Z')

beforeEach(() => {
  db = openLibraryDb(':memory:', '/w/proj')
})

afterEach(() => {
  db.close()
})

describe('what an agent has suggested', () => {
  it('starts with nothing waiting', () => {
    expect(listProposals(db)).toEqual([])
  })

  it('keeps a suggestion whole, and gives it back oldest first', () => {
    const first = addProposal(db, { title: 'One', body: 'First.', tags: ['a'] }, NOW)
    const second = addProposal(db, { title: 'Two', body: 'Second.', folder: 'plans' }, NOW + 1)
    expect(first).toMatchObject({
      folder: '',
      title: 'One',
      body: 'First.',
      tags: ['a'],
      proposedAtMs: NOW,
    })
    expect(first.id).not.toBe(second.id)
    expect(listProposals(db).map((one) => one.title)).toEqual(['One', 'Two'])
    expect(listProposals(db)[1]).toMatchObject({ folder: 'plans', tags: [] })
  })

  it('writes no note by itself: the library is untouched until a person says so', () => {
    addProposal(db, { title: 'One', body: 'First.' }, NOW)
    expect(listNotes(db).notes).toEqual([])
  })
})

describe('accepting one', () => {
  it('files the note as the agent that suggested it, and stops waiting', () => {
    const asked = addProposal(db, { title: 'Auth choice', body: 'Sessions.', tags: ['auth'] }, NOW)
    const note = acceptProposal(db, asked.id)
    expect(note).toMatchObject({
      id: 'Auth choice.md',
      folder: '',
      title: 'Auth choice',
      body: 'Sessions.',
      tags: ['auth'],
      source: 'agent',
    })
    expect(listNotes(db).notes.map((one) => one.id)).toEqual(['Auth choice.md'])
    expect(listProposals(db)).toEqual([])
  })

  it('files it into the folder it named, when the library has that folder', () => {
    addFolder(db, 'plans')
    const asked = addProposal(db, { title: 'Auth', body: 'Sessions.', folder: 'plans' }, NOW)
    expect(acceptProposal(db, asked.id)).toMatchObject({ id: 'plans/Auth.md', folder: 'plans' })
  })

  it('keeps the suggestion waiting when the note cannot be filed', () => {
    const asked = addProposal(db, { title: 'Auth', body: 'Sessions.', folder: 'gone' }, NOW)
    expect(acceptProposal(db, asked.id)).toBeNull()
    expect(listProposals(db)).toHaveLength(1)
    expect(listNotes(db).notes).toEqual([])
  })

  it('refuses a folder name that could climb out of the library', () => {
    const asked = addProposal(db, { title: 'Auth', body: 'S.', folder: '../etc' }, NOW)
    expect(acceptProposal(db, asked.id)).toBeNull()
  })

  it('answers nothing for a suggestion that is no longer there', () => {
    expect(acceptProposal(db, 'nobody')).toBeNull()
  })
})

describe('dismissing one', () => {
  it('drops it and writes nothing', () => {
    const asked = addProposal(db, { title: 'One', body: 'First.' }, NOW)
    dismissProposal(db, asked.id)
    expect(listProposals(db)).toEqual([])
    expect(listNotes(db).notes).toEqual([])
  })

  it('leaves the others alone', () => {
    const first = addProposal(db, { title: 'One', body: 'First.' }, NOW)
    addProposal(db, { title: 'Two', body: 'Second.' }, NOW + 1)
    dismissProposal(db, first.id)
    expect(listProposals(db).map((one) => one.title)).toEqual(['Two'])
  })
})

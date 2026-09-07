import type { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openLibraryDb } from '../library-db/library-db'
import {
  addFolder,
  createNote,
  fileNote,
  isFolderName,
  isNoteId,
  listNotes,
  readNote,
  removeFolder,
  removeNote,
  renameFolder,
  renameNote,
  writeNote,
} from './library-notes'

let db: DatabaseSync
const NOW = Date.parse('2026-08-28T03:00:00.000Z')
const BEFORE = Date.parse('2026-08-01T00:00:00.000Z')

beforeEach(() => {
  db = openLibraryDb(':memory:', '/w/proj')
})

afterEach(() => {
  db.close()
})

describe('what counts as a note id', () => {
  it('is a note at the root or one folder down', () => {
    expect(isNoteId('배송API-비교.md')).toBe(true)
    expect(isNoteId('분석/배송API-비교.md')).toBe(true)
    expect(isNoteId('a/b/c.md')).toBe(false)
  })

  it('refuses anything that could climb out or hide', () => {
    expect(isNoteId('.hidden.md')).toBe(false)
    expect(isNoteId('../x.md')).toBe(false)
    expect(isNoteId('a/../x.md')).toBe(false)
    expect(isNoteId('a\\x.md')).toBe(false)
    expect(isNoteId('a/x.txt')).toBe(false)
  })

  it('takes a plain folder name and nothing that could climb or hide', () => {
    expect(isFolderName('분석')).toBe(true)
    expect(isFolderName('.git')).toBe(false)
    expect(isFolderName('a/b')).toBe(false)
  })
})

describe('listing and reading', () => {
  it('lists newest first, with the head of each note and no body', () => {
    addFolder(db, 'deep')
    writeNote(db, 'one.md', 'First para.\n\nMore', { title: 'One', tags: ['a', 'b'] }, BEFORE)
    writeNote(db, 'deep/two.md', 'Second.', { title: 'Two' }, NOW)
    const listing = listNotes(db)
    expect(listing.folders).toEqual([{ name: 'deep' }])
    expect(listing.notes.map((one) => one.id)).toEqual(['deep/two.md', 'one.md'])
    expect(listing.notes[1]).toMatchObject({
      folder: '',
      title: 'One',
      summary: 'First para.',
      tags: ['a', 'b'],
      createdAtMs: BEFORE,
      updatedAtMs: BEFORE,
    })
    expect(listing.notes[1]).not.toHaveProperty('body')
    expect(readNote(db, 'one.md')?.body).toBe('First para.\n\nMore')
  })

  it('answers null for an id that is not a note, and for one nothing wrote', () => {
    expect(readNote(db, 'nothing.md')).toBeNull()
    expect(readNote(db, '../x.md')).toBeNull()
    expect(readNote(db, 42)).toBeNull()
  })

  it('lists nothing in a library nobody has written to', () => {
    expect(listNotes(db)).toEqual({ folders: [], notes: [] })
  })
})

describe('writing', () => {
  it('writes a body under a fresh head, and keeps when the note began', () => {
    createNote(db, '', 'One', BEFORE)
    const note = writeNote(db, 'One.md', 'new body', {}, NOW)
    expect(note).toMatchObject({
      id: 'One.md',
      title: 'One',
      body: 'new body',
      createdAtMs: BEFORE,
      updatedAtMs: NOW,
    })
  })

  it('takes a title and tags with the body, leaving the id alone', () => {
    createNote(db, '', 'One', BEFORE)
    const note = writeNote(db, 'One.md', 'x', { title: 'Renamed', tags: ['t'] }, NOW)
    expect(note).toMatchObject({ id: 'One.md', title: 'Renamed', tags: ['t'] })
  })

  it('refuses a folder that is not there', () => {
    expect(writeNote(db, 'ghost/x.md', 'x')).toBeNull()
    expect(writeNote(db, 'one.md', 42 as unknown as string)).toBeNull()
  })

  it('creates an empty note at the root or in a folder, dating a collision', () => {
    const one = createNote(db, null, 'Idea', NOW)
    expect(one).toMatchObject({ id: 'Idea.md', title: 'Idea', body: '' })
    // A clash is told apart by the day it arrived: a number says nothing about
    // either note, and the id it used to borrow said less.
    expect(createNote(db, '', 'Idea', NOW, 'en')?.id).toBe('Idea (August 28).md')
    expect(createNote(db, '', 'Idea', NOW, 'ko')?.id).toBe('Idea (8월 28일).md')
    // Two of a name on one day are still two notes; the count is what is left.
    expect(createNote(db, '', 'Idea', NOW, 'en')?.id).toBe('Idea (August 28) 2.md')
    addFolder(db, 'plans')
    expect(createNote(db, 'plans', 'Idea', NOW)?.id).toBe('plans/Idea.md')
    expect(createNote(db, 'nowhere', 'Idea')).toBeNull()
    expect(createNote(db, null, '../x')).toBeNull()
  })

  it('files an answer as a note titled from its words', () => {
    const filed = fileNote(db, '## What we found\n\nThe probe runs empty.', NOW)
    expect(filed?.already).toBe(false)
    expect(filed?.note).toMatchObject({
      id: 'What we found.md',
      title: 'What we found',
      summary: 'The probe runs empty.',
      createdAtMs: NOW,
    })
    expect(fileNote(db, '   ')).toBeNull()
  })

  it('files an answer whose own words would name a note nobody could open', () => {
    const hidden = fileNote(db, '## .env 를 손대지 말 것\n\n키가 들어 있다.', NOW)
    expect(hidden?.note.id).toBe('env 를 손대지 말 것.md')
    expect(readNote(db, hidden?.note.id)).not.toBeNull()
    const climbing = fileNote(db, '# a..b 정리\n\n둘을 나눴다.', NOW)
    expect(climbing?.note.id).toBe('a.b 정리.md')
    expect(readNote(db, climbing?.note.id)).not.toBeNull()
    const nameless = fileNote(db, '...', NOW)
    expect(nameless?.note.id).toBe('Untitled.md')
    expect(readNote(db, nameless?.note.id)).not.toBeNull()
  })

  it('files the same answer once, and hands back the note already there', () => {
    const text = '## 팀원별 README.md 요약\n\n셋을 한 번에 불렀다.'
    const first = fileNote(db, text, NOW)
    expect(first).toMatchObject({ already: false, note: { id: '팀원별 README.md 요약.md' } })
    // One run can show the same passage in several turns; filing each of them
    // meant to keep the passage, not to keep it three times.
    const again = fileNote(db, text, NOW + 1000)
    expect(again).toMatchObject({ already: true, note: { id: '팀원별 README.md 요약.md' } })
    expect(listNotes(db).notes).toHaveLength(1)
  })

  it('reads the same answer through its own whitespace', () => {
    fileNote(db, '한 줄.', NOW)
    expect(fileNote(db, '  한 줄.\n\n  ', NOW)?.already).toBe(true)
    expect(listNotes(db).notes).toHaveLength(1)
  })

  it('files two answers that only look alike as two notes, dating the second', () => {
    expect(fileNote(db, '# 놀이터 규칙\n\n하나만 지킨다.', NOW, 'ko')?.note.id).toBe(
      '놀이터 규칙.md',
    )
    // A clash gets the day it arrived; the raw id it used to borrow named
    // nothing a person reading their library could place.
    expect(fileNote(db, '# 놀이터 규칙\n\n둘을 지킨다.', NOW, 'ko')?.note.id).toBe(
      '놀이터 규칙 (8월 28일).md',
    )
  })

  it('marks who wrote the note, and keeps that mark on a later write', () => {
    createNote(db, '', 'From a session', NOW)
    expect(writeNote(db, 'From a session.md', 'x', { source: 'agent' }, NOW)?.source).toBe('agent')
    expect(writeNote(db, 'From a session.md', 'y', {}, NOW)?.source).toBe('agent')
    expect(createNote(db, '', 'By hand', NOW)?.source).toBe('')
  })

  it('refuses a title that ends in a period, and allows a case-only rename', () => {
    createNote(db, '', 'one', NOW)
    expect(renameNote(db, 'one.md', 'etc.', NOW)).toBeNull()
    expect(readNote(db, 'one.md')).not.toBeNull()
    expect(renameNote(db, 'one.md', 'ONE', NOW)?.id).toBe('ONE.md')
    expect(readNote(db, 'one.md')).toBeNull()
  })

  it('renames a note in place, updating its head, and refuses a taken name', () => {
    createNote(db, '', 'One', BEFORE)
    createNote(db, '', 'Two', BEFORE)
    const moved = renameNote(db, 'One.md', 'Uno', NOW)
    expect(moved).toMatchObject({ id: 'Uno.md', title: 'Uno', updatedAtMs: NOW })
    expect(readNote(db, 'One.md')).toBeNull()
    expect(renameNote(db, 'Uno.md', 'Two')).toBeNull()
  })

  it('removes only a real note id', () => {
    createNote(db, '', 'One', NOW)
    removeNote(db, '../One.md')
    expect(readNote(db, 'One.md')).not.toBeNull()
    removeNote(db, 'One.md')
    expect(readNote(db, 'One.md')).toBeNull()
  })
})

describe('folders', () => {
  it('adds, renames and removes a folder, moving its notes with it', () => {
    addFolder(db, 'plans')
    writeNote(db, 'plans/a.md', 'a', { title: 'A' }, NOW)
    const renamed = renameFolder(db, 'plans', 'ideas')
    expect(renamed.folders).toEqual([{ name: 'ideas' }])
    expect(renamed.notes.map((one) => one.id)).toEqual(['ideas/a.md'])
    expect(readNote(db, 'ideas/a.md')).toMatchObject({ folder: 'ideas', title: 'A' })
    expect(removeFolder(db, 'ideas').folders).toEqual([{ name: 'ideas' }])
    removeNote(db, 'ideas/a.md')
    expect(removeFolder(db, 'ideas').folders).toEqual([])
  })

  it('refuses a folder named like a hidden one, or one that is already there', () => {
    expect(addFolder(db, '.zetrem').folders).toEqual([])
    addFolder(db, 'a')
    expect(addFolder(db, 'a').folders).toEqual([{ name: 'a' }])
    addFolder(db, 'b')
    expect(renameFolder(db, 'a', 'b').folders).toEqual([{ name: 'a' }, { name: 'b' }])
  })
})

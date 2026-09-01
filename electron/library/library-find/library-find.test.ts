import type { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LibraryNote } from '@/entities/library/model/note'
import { openLibraryDb, putNote } from '../library-db/library-db'
import { backlinksTo, ftsQuery, recentNotes, searchNotes } from './library-find'

let db: DatabaseSync

function put(over: Partial<LibraryNote> & { id: string }): void {
  putNote(db, {
    folder: '',
    title: over.id.replace(/\.md$/, ''),
    summary: '',
    tags: [],
    source: '',
    createdAtMs: 1,
    updatedAtMs: 1,
    body: '',
    ...over,
  })
}

beforeEach(() => {
  db = openLibraryDb(':memory:', '/w/proj')
})

afterEach(() => {
  db.close()
})

describe('search', () => {
  function seeded(): void {
    put({ id: 'plan.md', title: 'Release plan', body: 'ship the desk in autumn' })
    put({ id: 'notes.md', title: 'Notes', body: 'the desk needs a lamp', tags: ['furniture'] })
    put({
      id: 'ko.md',
      title: '회의록',
      body: '오늘 회의에서 검색 기능을 논의했다',
      tags: ['회의'],
    })
    put({ id: 'joined.md', title: 'Joined', body: '붙어있는한국어문장입니다' })
  }

  it('finds words in the title, body, and tags', () => {
    seeded()
    expect(searchNotes(db, 'release').map((hit) => hit.id)).toEqual(['plan.md'])
    expect(searchNotes(db, 'lamp').map((hit) => hit.id)).toEqual(['notes.md'])
    expect(searchNotes(db, 'furniture').map((hit) => hit.id)).toEqual(['notes.md'])
  })

  it('returns every note that has all the words, up to the limit', () => {
    seeded()
    expect(searchNotes(db, 'desk').length).toBe(2)
    expect(searchNotes(db, 'desk', 1).length).toBe(1)
    expect(searchNotes(db, 'desk lamp').map((hit) => hit.id)).toEqual(['notes.md'])
  })

  it('carries a snippet and the head of the note, but never the whole body', () => {
    seeded()
    const [hit] = searchNotes(db, 'lamp')
    expect(hit?.snippet).toContain('lamp')
    expect(hit?.tags).toEqual(['furniture'])
    expect(hit?.summary).toBe('the desk needs a lamp')
    expect(hit).not.toHaveProperty('body')
  })

  it('prefix-matches the last word', () => {
    seeded()
    expect(searchNotes(db, 'autu').map((hit) => hit.id)).toEqual(['plan.md'])
  })

  it('finds Korean words that stand between spaces, by whole word or prefix', () => {
    seeded()
    expect(searchNotes(db, '검색').map((hit) => hit.id)).toEqual(['ko.md'])
    expect(searchNotes(db, '회의').map((hit) => hit.id)).toEqual(['ko.md'])
    expect(searchNotes(db, '붙어있는').map((hit) => hit.id)).toEqual(['joined.md'])
  })

  // unicode61 splits on spaces and punctuation only, so a word in the middle of
  // an unspaced Korean run is not a token of its own.
  it('does not find a Korean word buried inside an unspaced run', () => {
    seeded()
    expect(searchNotes(db, '한국어').map((hit) => hit.id)).toEqual([])
  })

  it('returns nothing for an empty or hostile query', () => {
    seeded()
    expect(searchNotes(db, '')).toEqual([])
    expect(searchNotes(db, '   ')).toEqual([])
    expect(searchNotes(db, '"(')).toEqual([])
    expect(searchNotes(db, 'NOT AND OR')).toEqual([])
    expect(searchNotes(db, 'desk*  "lamp')).toEqual(searchNotes(db, 'desk lamp'))
  })
})

describe('recent', () => {
  it('orders by last update, newest first, and respects the limit', () => {
    put({ id: 'a.md', updatedAtMs: 10 })
    put({ id: 'b.md', updatedAtMs: 30 })
    put({ id: 'c.md', updatedAtMs: 20 })
    expect(recentNotes(db).map((one) => one.id)).toEqual(['b.md', 'c.md', 'a.md'])
    expect(recentNotes(db, 2).map((one) => one.id)).toEqual(['b.md', 'c.md'])
  })
})

describe('backlinks', () => {
  it('resolves plain and aliased links and skips links inside code', () => {
    put({ id: 'plain.md', body: 'see [[Target]]', updatedAtMs: 1 })
    put({ id: 'alias.md', body: 'see [[ Target |over there]]', updatedAtMs: 2 })
    put({ id: 'fenced.md', body: '```\n[[Target]]\n```' })
    put({ id: 'inline.md', body: 'a `[[Target]]` here' })
    put({ id: 'other.md', body: '[[Elsewhere]]' })
    expect(backlinksTo(db, 'Target').map((one) => one.id)).toEqual(['alias.md', 'plain.md'])
    expect(backlinksTo(db, 'Nobody')).toEqual([])
  })
})

describe('helpers', () => {
  it('quotes every word and prefixes the last', () => {
    expect(ftsQuery('  one  two ')).toBe('"one" AND "two"*')
    expect(ftsQuery('say "hi"')).toBe('"say" AND """hi"""*')
    expect(ftsQuery('  ')).toBeNull()
  })
})

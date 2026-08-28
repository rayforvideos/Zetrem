import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { ftsQuery, linkTargets, openLibraryIndex } from './library-index'
import type { IndexedNote, LibraryIndex } from './library-index.types'

function note(over: Partial<IndexedNote> & { id: string }): IndexedNote {
  const title = over.title ?? over.id.replace(/\.md$/, '')
  return {
    folder: '',
    title,
    summary: '',
    tags: [],
    source: '',
    createdAtMs: 1,
    updatedAtMs: 1,
    body: '',
    hash: `${over.id}:${over.body ?? ''}`,
    ...over,
  }
}

const open: LibraryIndex[] = []
function index(file = ':memory:'): LibraryIndex {
  const idx = openLibraryIndex(file)
  open.push(idx)
  return idx
}

afterEach(() => {
  for (const idx of open.splice(0)) idx.close()
})

describe('schema', () => {
  it('drops and recreates the tables when the version on disk differs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'library-index-'))
    const file = join(dir, 'index.db')
    try {
      const first = index(file)
      first.sync([note({ id: 'old.md', body: 'stale words' })])
      first.close()
      open.pop()

      const raw = new DatabaseSync(file)
      raw.prepare("UPDATE meta SET value = 'bogus' WHERE key = 'schema_version'").run()
      raw.close()

      const second = index(file)
      expect(second.recent()).toEqual([])
      expect(second.search('stale')).toEqual([])
      second.sync([note({ id: 'new.md', body: 'fresh words' })])
      expect(second.search('fresh').map((hit) => hit.id)).toEqual(['new.md'])
    } finally {
      for (const idx of open.splice(0)) idx.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('keeps the rows when the version matches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'library-index-'))
    const file = join(dir, 'index.db')
    try {
      const first = index(file)
      first.sync([note({ id: 'kept.md', body: 'still here' })])
      first.close()
      open.pop()
      expect(
        index(file)
          .search('still')
          .map((hit) => hit.id),
      ).toEqual(['kept.md'])
    } finally {
      for (const idx of open.splice(0)) idx.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('sync', () => {
  it('inserts, updates by hash, and deletes what is gone', () => {
    const idx = index()
    idx.sync([
      note({ id: 'a.md', body: 'alpha text', hash: 'h1' }),
      note({ id: 'b.md', body: 'beta text', hash: 'h2' }),
    ])
    expect(
      idx
        .recent()
        .map((n) => n.id)
        .sort(),
    ).toEqual(['a.md', 'b.md'])

    idx.sync([
      note({ id: 'a.md', body: 'changed text [[b]]', hash: 'h1b', updatedAtMs: 5 }),
      note({ id: 'c.md', body: 'gamma text', hash: 'h3' }),
    ])
    expect(idx.recent().map((n) => n.id)).toEqual(['a.md', 'c.md'])
    expect(idx.search('alpha')).toEqual([])
    expect(idx.search('changed').map((hit) => hit.id)).toEqual(['a.md'])
    expect(idx.search('beta')).toEqual([])
    expect(idx.backlinks('b').map((n) => n.id)).toEqual(['a.md'])
  })

  it('leaves a note alone when its hash is unchanged', () => {
    const idx = index()
    idx.sync([note({ id: 'a.md', body: 'first body', hash: 'same' })])
    idx.sync([note({ id: 'a.md', body: 'second body', hash: 'same' })])
    expect(idx.search('first').map((hit) => hit.id)).toEqual(['a.md'])
    expect(idx.search('second')).toEqual([])
  })
})

describe('search', () => {
  function seeded(): LibraryIndex {
    const idx = index()
    idx.sync([
      note({ id: 'plan.md', title: 'Release plan', body: 'ship the desk in autumn' }),
      note({ id: 'notes.md', title: 'Notes', body: 'the desk needs a lamp', tags: ['furniture'] }),
      note({
        id: 'ko.md',
        title: '회의록',
        body: '오늘 회의에서 검색 기능을 논의했다',
        tags: ['회의'],
        source: '',
      }),
      note({ id: 'joined.md', title: 'Joined', body: '붙어있는한국어문장입니다' }),
    ])
    return idx
  }

  it('finds words in the title, body, and tags', () => {
    const idx = seeded()
    expect(idx.search('release').map((hit) => hit.id)).toEqual(['plan.md'])
    expect(idx.search('lamp').map((hit) => hit.id)).toEqual(['notes.md'])
    expect(idx.search('furniture').map((hit) => hit.id)).toEqual(['notes.md'])
  })

  it('returns every note that has all the words, up to the limit', () => {
    const idx = seeded()
    expect(idx.search('desk').length).toBe(2)
    expect(idx.search('desk', 1).length).toBe(1)
    expect(idx.search('desk lamp').map((hit) => hit.id)).toEqual(['notes.md'])
  })

  it('carries a snippet from the body and the summary fields', () => {
    const [hit] = seeded().search('lamp')
    expect(hit?.snippet).toContain('lamp')
    expect(hit?.tags).toEqual(['furniture'])
  })

  it('prefix-matches the last word', () => {
    expect(
      seeded()
        .search('autu')
        .map((hit) => hit.id),
    ).toEqual(['plan.md'])
  })

  it('finds Korean words that stand between spaces, by whole word or prefix', () => {
    const idx = seeded()
    expect(idx.search('검색').map((hit) => hit.id)).toEqual(['ko.md'])
    expect(idx.search('회의').map((hit) => hit.id)).toEqual(['ko.md'])
    expect(idx.search('붙어있는').map((hit) => hit.id)).toEqual(['joined.md'])
  })

  // unicode61 splits on spaces and punctuation only, so a word in the middle of
  // an unspaced Korean run is not a token of its own.
  it('does not find a Korean word buried inside an unspaced run', () => {
    expect(
      seeded()
        .search('한국어')
        .map((hit) => hit.id),
    ).toEqual([])
  })

  it('returns nothing for an empty or hostile query', () => {
    const idx = seeded()
    expect(idx.search('')).toEqual([])
    expect(idx.search('   ')).toEqual([])
    expect(idx.search('"(')).toEqual([])
    expect(idx.search('NOT AND OR')).toEqual([])
    expect(idx.search('desk*  "lamp')).toEqual(idx.search('desk lamp'))
  })
})

describe('recent', () => {
  it('orders by last update, newest first, and respects the limit', () => {
    const idx = index()
    idx.sync([
      note({ id: 'a.md', updatedAtMs: 10 }),
      note({ id: 'b.md', updatedAtMs: 30 }),
      note({ id: 'c.md', updatedAtMs: 20 }),
    ])
    expect(idx.recent().map((n) => n.id)).toEqual(['b.md', 'c.md', 'a.md'])
    expect(idx.recent(2).map((n) => n.id)).toEqual(['b.md', 'c.md'])
  })
})

describe('backlinks', () => {
  it('resolves plain and aliased links and skips links inside code', () => {
    const idx = index()
    idx.sync([
      note({ id: 'plain.md', body: 'see [[Target]]', updatedAtMs: 1 }),
      note({ id: 'alias.md', body: 'see [[ Target |over there]]', updatedAtMs: 2 }),
      note({ id: 'fenced.md', body: '```\n[[Target]]\n```' }),
      note({ id: 'inline.md', body: 'a `[[Target]]` here' }),
      note({ id: 'other.md', body: '[[Elsewhere]]' }),
    ])
    expect(idx.backlinks('Target').map((n) => n.id)).toEqual(['alias.md', 'plain.md'])
    expect(idx.backlinks('Nobody')).toEqual([])
  })
})

describe('helpers', () => {
  it('parses link targets once each', () => {
    expect(linkTargets('[[A]] [[A|x]] [[B]] `[[C]]`')).toEqual(['A', 'B'])
  })

  it('quotes every word and prefixes the last', () => {
    expect(ftsQuery('  one  two ')).toBe('"one" AND "two"*')
    expect(ftsQuery('say "hi"')).toBe('"say" AND """hi"""*')
    expect(ftsQuery('  ')).toBeNull()
  })
})

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import type { LibraryNote } from '@/entities/library/model/note'
import {
  dropNote,
  libraryDbFile,
  linkTargets,
  openLibraryDb,
  putNote,
  replaceNote,
} from './library-db'

const open: DatabaseSync[] = []

function db(file = ':memory:', workspace = '/w/proj'): DatabaseSync {
  const one = openLibraryDb(file, workspace)
  open.push(one)
  return one
}

afterEach(() => {
  for (const one of open.splice(0)) one.close()
})

function note(over: Partial<LibraryNote> & { id: string }): LibraryNote {
  return {
    folder: '',
    title: over.id.replace(/\.md$/, ''),
    summary: '',
    tags: [],
    source: '',
    createdAtMs: 1,
    updatedAtMs: 1,
    body: '',
    ...over,
  }
}

describe('where a library lives', () => {
  it('names the file after the project folder, so a person can tell them apart', () => {
    const file = libraryDbFile('/u', '/w/proj')
    expect(file.startsWith(join('/u', 'library', 'proj-'))).toBe(true)
    expect(file.endsWith('.sqlite')).toBe(true)
  })

  it('parts two projects of the same name by where they really are', () => {
    expect(libraryDbFile('/u', '/one/proj')).not.toBe(libraryDbFile('/u', '/two/proj'))
    expect(libraryDbFile('/u', '/one/proj')).toBe(libraryDbFile('/u', '/one/proj'))
  })

  it('keeps a Korean name and a hyphen, and drops what a file name cannot carry', () => {
    expect(libraryDbFile('/u', '/w/내 프로젝트')).toContain('내 프로젝트-')
    expect(libraryDbFile('/u', '/w/my-proj')).toContain(join('library', 'my-proj-'))
    const odd = libraryDbFile('/u', '/w/a:b*c?d')
    expect(odd).not.toMatch(/[:*?]/)
    expect(odd).toContain('a b c d-')
  })

  it('cuts a very long name and never leaves the file hidden or nameless', () => {
    const long = libraryDbFile('/u', `/w/${'가'.repeat(200)}`)
    expect(long.length).toBeLessThan(join('/u', 'library').length + 60)
    expect(libraryDbFile('/u', '/w/.hidden')).toContain(join('library', 'hidden-'))
    expect(libraryDbFile('/u', '/w/...')).toContain(join('library', 'library-'))
  })
})

describe('opening a library', () => {
  it('lays the tables and writes down which project they belong to', () => {
    const one = db()
    const kept = one.prepare("SELECT value FROM meta WHERE key = 'workspace'").get() as {
      value: string
    }
    expect(kept.value).toBe('/w/proj')
    const tables = (
      one.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
        name: string
      }[]
    ).map((row) => row.name)
    expect(tables).toEqual(expect.arrayContaining(['meta', 'notes', 'folders', 'links']))
  })

  it('keeps every note it already holds, since the file is the original', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zetrem-library-db-'))
    const file = join(dir, 'one.sqlite')
    try {
      const first = db(file)
      putNote(first, note({ id: 'kept.md', body: 'still here' }))
      first.close()
      open.pop()

      // A version this one does not know wrote the file last.
      const raw = new DatabaseSync(file)
      raw.prepare("UPDATE meta SET value = '99' WHERE key = 'schema_version'").run()
      raw.close()

      const second = db(file)
      expect(second.prepare('SELECT id FROM notes').all()).toEqual([{ id: 'kept.md' }])
    } finally {
      for (const one of open.splice(0)) one.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('putting a note away', () => {
  it('files it for search and records what it links to', () => {
    const one = db()
    putNote(one, note({ id: 'a.md', title: 'Auth', body: 'we chose [[Sessions]]', tags: ['x'] }))
    expect(
      one.prepare("SELECT id FROM notes_fts WHERE notes_fts MATCH 'chose'").all(),
    ).toHaveLength(1)
    expect(one.prepare('SELECT to_title FROM links WHERE from_id = ?').all('a.md')).toEqual([
      { to_title: 'Sessions' },
    ])
  })

  it('replaces what was there rather than doubling it', () => {
    const one = db()
    putNote(one, note({ id: 'a.md', body: 'first' }))
    putNote(one, note({ id: 'a.md', body: 'second' }))
    expect(one.prepare('SELECT count(*) AS n FROM notes').get()).toEqual({ n: 1 })
    expect(one.prepare('SELECT count(*) AS n FROM notes_fts').get()).toEqual({ n: 1 })
  })

  it('writes the note as one change, and joins a change already under way', () => {
    const one = db()
    one.exec('BEGIN')
    putNote(one, note({ id: 'a.md', body: 'inside a change of its own' }))
    replaceNote(one, 'a.md', note({ id: 'b.md', body: 'moved' }))
    one.exec('ROLLBACK')
    expect(one.prepare('SELECT count(*) AS n FROM notes').get()).toEqual({ n: 0 })
    expect(one.isTransaction).toBe(false)
  })

  it('never leaves the old note behind when one takes the place of another', () => {
    const one = db()
    putNote(one, note({ id: 'a.md', body: 'first [[Elsewhere]]' }))
    replaceNote(one, 'a.md', note({ id: 'b.md', body: 'second' }))
    expect(one.prepare('SELECT id FROM notes').all()).toEqual([{ id: 'b.md' }])
    expect(one.prepare('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 })
    expect(one.prepare("SELECT id FROM notes_fts WHERE notes_fts MATCH 'first'").all()).toEqual([])
  })

  it('takes the note out of search and the links with it when it goes', () => {
    const one = db()
    putNote(one, note({ id: 'a.md', body: 'gone soon [[Elsewhere]]' }))
    dropNote(one, 'a.md')
    expect(one.prepare('SELECT count(*) AS n FROM notes').get()).toEqual({ n: 0 })
    expect(one.prepare('SELECT count(*) AS n FROM notes_fts').get()).toEqual({ n: 0 })
    expect(one.prepare('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 })
  })
})

describe('links in a body', () => {
  it('parses link targets once each, and skips what is inside code', () => {
    expect(linkTargets('[[A]] [[A|x]] [[B]] `[[C]]`')).toEqual(['A', 'B'])
  })
})

describe('the proposals table gaining session and by', () => {
  it('has both columns on a freshly laid file', () => {
    const one = db()
    const cols = new Set(
      (one.prepare('PRAGMA table_info(proposals)').all() as { name: string }[]).map(
        (col) => col.name,
      ),
    )
    expect(cols.has('session')).toBe(true)
    expect(cols.has('by')).toBe(true)
  })

  it('adds the columns to a file laid before they existed, defaulting rows already there', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'zetrem-lib-')), 'old.sqlite')
    const old = new DatabaseSync(file)
    try {
      old.exec(`
        CREATE TABLE proposals (
          id TEXT PRIMARY KEY,
          folder TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          tags TEXT NOT NULL,
          proposed_at_ms INTEGER NOT NULL
        );
      `)
      old
        .prepare(
          'INSERT INTO proposals (id, folder, title, body, tags, proposed_at_ms) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('p1', '', 'Old', 'From before the column existed.', '[]', 1)
    } finally {
      old.close()
    }
    const opened = db(file)
    const row = opened.prepare('SELECT * FROM proposals WHERE id = ?').get('p1') as {
      session: string
      by: string
    }
    expect(row.session).toBe('')
    expect(row.by).toBe('')
  })
})

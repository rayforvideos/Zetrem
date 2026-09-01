import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openLibraryDb } from '../library-db/library-db'
import { listNotes, readNote, writeNote } from '../library-notes/library-notes'
import { importOldNotes } from './library-import'

let db: DatabaseSync
let workspace = ''
const NOW = Date.parse('2026-08-28T03:00:00.000Z')

function old(id: string, text: string, atMs = NOW): void {
  const path = join(workspace, '.zetrem', 'library', id)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
  utimesSync(path, atMs / 1000, atMs / 1000)
}

function headed(title: string, body: string, extra = ''): string {
  return `---\ntitle: ${title}\ncreated: 2026-08-01T00:00:00.000Z\nupdated: 2026-08-02T00:00:00.000Z\n${extra}---\n${body}\n`
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'zetrem-ws-'))
  db = openLibraryDb(':memory:', workspace)
})

afterEach(() => {
  db.close()
  rmSync(workspace, { recursive: true, force: true })
})

describe('taking in a library that was kept as files', () => {
  it('reads every note with its head and takes the folder out of the project', async () => {
    old('one.md', headed('One', 'First para.\n\nMore', 'tags: [a, b]\nsource: agent\n'))
    expect(await importOldNotes(db, workspace)).toBe(1)
    expect(readNote(db, 'one.md')).toMatchObject({
      id: 'one.md',
      folder: '',
      title: 'One',
      body: 'First para.\n\nMore',
      summary: 'First para.',
      tags: ['a', 'b'],
      source: 'agent',
      createdAtMs: Date.parse('2026-08-01T00:00:00.000Z'),
      updatedAtMs: Date.parse('2026-08-02T00:00:00.000Z'),
    })
    expect(existsSync(join(workspace, '.zetrem'))).toBe(false)
  })

  it('keeps a note in the folder it sat in, and the folder with nothing in it too', async () => {
    old('deep/two.md', headed('Two', 'Second.'))
    mkdirSync(join(workspace, '.zetrem', 'library', 'empty'), { recursive: true })
    expect(await importOldNotes(db, workspace)).toBe(1)
    const listing = listNotes(db)
    expect(listing.folders).toEqual([{ name: 'deep' }, { name: 'empty' }])
    expect(listing.notes.map((one) => one.id)).toEqual(['deep/two.md'])
    expect(readNote(db, 'deep/two.md')?.folder).toBe('deep')
  })

  it('takes a plain file with no head as a note named by its file and dated by its stamp', async () => {
    old('plain.md', 'Just words here.\n', NOW - 5000)
    await importOldNotes(db, workspace)
    expect(readNote(db, 'plain.md')).toMatchObject({
      title: 'plain',
      tags: [],
      body: 'Just words here.\n',
      summary: 'Just words here.',
      updatedAtMs: NOW - 5000,
    })
  })

  it('leaves a note the library already holds as it is', async () => {
    writeNote(db, 'one.md', 'what is already here', { title: 'Mine' }, NOW)
    old('one.md', headed('One', 'the older words'))
    expect(await importOldNotes(db, workspace)).toBe(0)
    expect(readNote(db, 'one.md')?.body).toBe('what is already here')
  })

  it('passes over what was never a note, what sat too deep, and the app own file', async () => {
    old('.hidden.md', headed('Hidden', 'x'))
    old('notes.txt', 'plain text')
    old('a/b/c.md', headed('Deep', 'x'))
    old('CLAUDE.md', '# 라이브러리\n')
    expect(await importOldNotes(db, workspace)).toBe(0)
    expect(listNotes(db).notes).toEqual([])
  })

  it('leaves behind what it could not take, rather than taking the folder away', async () => {
    const root = join(workspace, '.zetrem', 'library')
    old('one.md', headed('One', 'a'))
    old('.hidden.md', headed('Hidden', 'x'))
    old('notes.txt', 'plain text')
    old('CLAUDE.md', '# 라이브러리\n')
    expect(await importOldNotes(db, workspace)).toBe(1)
    // What came across is gone, and the app own file with it; what did not is
    // still the person's to look at.
    expect(existsSync(join(root, 'one.md'))).toBe(false)
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false)
    expect(existsSync(join(root, '.hidden.md'))).toBe(true)
    expect(existsSync(join(root, 'notes.txt'))).toBe(true)
  })

  it('takes nothing twice, and gives up the folder once the rest is dealt with', async () => {
    old('one.md', headed('One', 'a'))
    old('notes.txt', 'plain text')
    await importOldNotes(db, workspace)
    expect(existsSync(join(workspace, '.zetrem'))).toBe(true)
    rmSync(join(workspace, '.zetrem', 'library', 'notes.txt'))
    expect(await importOldNotes(db, workspace)).toBe(0)
    expect(existsSync(join(workspace, '.zetrem'))).toBe(false)
    expect(listNotes(db).notes.map((one) => one.id)).toEqual(['one.md'])
  })

  it('does nothing, and takes nothing away, when the project kept no library', async () => {
    mkdirSync(join(workspace, '.zetrem'), { recursive: true })
    writeFileSync(join(workspace, '.zetrem', 'other.json'), '{}')
    expect(await importOldNotes(db, workspace)).toBe(0)
    expect(existsSync(join(workspace, '.zetrem', 'other.json'))).toBe(true)
  })
})

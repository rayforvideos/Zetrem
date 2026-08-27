import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addFolder,
  createNote,
  fileNote,
  isFolderName,
  isNoteId,
  isWritableId,
  listFolders,
  listNotes,
  notesForIndex,
  readNote,
  removeFolder,
  removeNote,
  renameFolder,
  renameNote,
  writeNote,
} from './vault-notes'

let root = ''
let outside = ''
const NOW = Date.parse('2026-08-28T03:00:00.000Z')

function headed(title: string, body: string, extra = ''): string {
  return `---\ntitle: ${title}\ncreated: 2026-08-01T00:00:00.000Z\nupdated: 2026-08-02T00:00:00.000Z\nsource: agent\n${extra}---\n${body}\n`
}

function file(id: string, text: string, atMs = NOW): void {
  const at = id.lastIndexOf('/')
  if (at !== -1) mkdirSync(join(root, id.slice(0, at)), { recursive: true })
  const path = join(root, id)
  writeFileSync(path, text)
  utimesSync(path, atMs / 1000, atMs / 1000)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'zetrem-vault-notes-'))
  outside = mkdtempSync(join(tmpdir(), 'zetrem-vault-outside-'))
  writeFileSync(join(root, 'CLAUDE.md'), '# guide\n')
  writeFileSync(join(root, '.zetrem'), '')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

describe('what counts as a note id', () => {
  it('is a markdown file at the root or one folder down', () => {
    expect(isNoteId('배송API-비교.md')).toBe(true)
    expect(isNoteId('분석/배송API-비교.md')).toBe(true)
    expect(isNoteId('a/b/c.md')).toBe(false)
  })

  it('refuses anything that could leave the vault, hide, or name the guide', () => {
    expect(isNoteId('CLAUDE.md')).toBe(false)
    expect(isNoteId('.hidden.md')).toBe(false)
    expect(isNoteId('../x.md')).toBe(false)
    expect(isNoteId('a/../x.md')).toBe(false)
    expect(isNoteId('a\\x.md')).toBe(false)
    expect(isNoteId('a/x.txt')).toBe(false)
    expect(isWritableId('CLAUDE.md')).toBe(true)
  })

  it('takes a plain folder name and nothing that could climb or hide', () => {
    expect(isFolderName('분석')).toBe(true)
    expect(isFolderName('.git')).toBe(false)
    expect(isFolderName('a/b')).toBe(false)
    expect(isFolderName('CLAUDE.md')).toBe(false)
  })
})

describe('listing and reading', () => {
  it('reads the head of each note and lists newest first, guide and marker unseen', async () => {
    file('one.md', headed('One', 'First para.\n\nMore', 'tags: [a, b]\nsession: s1\n'))
    file('deep/two.md', headed('Two', 'Second.'))
    const listing = await listNotes(root)
    expect(listing.folders).toEqual([{ name: 'deep' }])
    expect(listing.notes.map((one) => one.id)).toEqual(['one.md', 'deep/two.md'])
    const one = listing.notes[0]
    expect(one).toMatchObject({
      folder: '',
      title: 'One',
      summary: 'First para.',
      source: 'agent',
      tags: ['a', 'b'],
      createdAtMs: Date.parse('2026-08-01T00:00:00.000Z'),
      updatedAtMs: Date.parse('2026-08-02T00:00:00.000Z'),
    })
    expect(one).not.toHaveProperty('body')
    const read = await readNote(root, 'one.md')
    expect(read?.body).toBe('First para.\n\nMore')
    expect(read?.session).toBe('s1')
  })

  it('takes a plain file with no head as a person note named by its file', async () => {
    file('plain.md', 'Just words here.\n', NOW - 5000)
    const note = await readNote(root, 'plain.md')
    expect(note).toMatchObject({
      title: 'plain',
      source: 'person',
      tags: [],
      summary: 'Just words here.',
      updatedAtMs: NOW - 5000,
    })
  })

  it('answers null for an id that is not a note and never follows a symlink out', async () => {
    writeFileSync(join(outside, 'x.md'), headed('X', 'x'))
    symlinkSync(join(outside, 'x.md'), join(root, 'link.md'))
    expect(await readNote(root, 'link.md')).toBeNull()
    expect(await readNote(root, '../x.md')).toBeNull()
    expect((await listNotes(root)).notes).toEqual([])
  })

  it('lists nothing when the vault is not there yet', async () => {
    expect(await listNotes(join(root, 'nope'))).toEqual({ folders: [], notes: [] })
    expect(await listFolders(join(root, 'nope'))).toEqual([])
  })

  it('hands the index every note with a hash of the file as written', async () => {
    file('one.md', headed('One', 'a'))
    const [note] = await notesForIndex(root)
    expect(note?.hash).toMatch(/^[0-9a-f]{40}$/)
    expect(note?.body).toBe('a')
    const again = await notesForIndex(root)
    expect(again[0]?.hash).toBe(note?.hash)
  })
})

describe('writing', () => {
  it('writes a body under a fresh head, and keeps who wrote it and when it began', async () => {
    file('one.md', headed('One', 'old'))
    const note = await writeNote(root, 'one.md', 'new body', {}, NOW)
    expect(note?.body).toBe('new body')
    expect(note?.source).toBe('agent')
    expect(note?.createdAtMs).toBe(Date.parse('2026-08-01T00:00:00.000Z'))
    expect(note?.updatedAtMs).toBe(NOW)
    expect(readFileSync(join(root, 'one.md'), 'utf8')).toMatch(/^---\ntitle: One\n/)
  })

  it('takes a title and tags with the body', async () => {
    file('one.md', headed('One', 'x'))
    const note = await writeNote(root, 'one.md', 'x', { title: 'Renamed', tags: ['t'] }, NOW)
    expect(note).toMatchObject({ id: 'one.md', title: 'Renamed', tags: ['t'] })
  })

  it('writes the guide as plain text and refuses a folder that is not there', async () => {
    expect((await writeNote(root, 'CLAUDE.md', '# mine\n'))?.body).toBe('# mine\n')
    expect(await writeNote(root, 'ghost/x.md', 'x')).toBeNull()
  })

  it('creates an empty person note at the root or in a folder, numbering a collision', async () => {
    const one = await createNote(root, null, 'Idea', NOW)
    expect(one).toMatchObject({ id: 'Idea.md', title: 'Idea', source: 'person', body: '' })
    const two = await createNote(root, '', 'Idea', NOW)
    expect(two?.id).toBe('Idea 2.md')
    mkdirSync(join(root, 'plans'))
    expect((await createNote(root, 'plans', 'Idea', NOW))?.id).toBe('plans/Idea.md')
    expect(await createNote(root, 'nowhere', 'Idea')).toBeNull()
    expect(await createNote(root, null, '../x')).toBeNull()
  })

  it('files an answer as an agent note titled from its words, with the session', async () => {
    const note = await fileNote(root, '## What we found\n\nThe probe runs empty.', 'sess-1', NOW)
    expect(note).toMatchObject({
      id: 'What we found.md',
      title: 'What we found',
      source: 'agent',
      session: 'sess-1',
      summary: 'The probe runs empty.',
      createdAtMs: NOW,
    })
    expect(await fileNote(root, '   ', 'sess-1')).toBeNull()
  })

  it('writes nothing through a symlink standing for a folder outside', async () => {
    symlinkSync(outside, join(root, 'away'))
    expect(await writeNote(root, 'away/x.md', 'x')).toBeNull()
    expect(existsSync(join(outside, 'x.md'))).toBe(false)
  })

  it('renames a note in place, updating its head, and refuses a taken name', async () => {
    file('one.md', headed('One', 'x'))
    file('two.md', headed('Two', 'y'))
    const moved = await renameNote(root, 'one.md', 'Uno', NOW)
    expect(moved).toMatchObject({ id: 'Uno.md', title: 'Uno', updatedAtMs: NOW })
    expect(existsSync(join(root, 'one.md'))).toBe(false)
    expect(await renameNote(root, 'Uno.md', 'Two')).toBeNull()
  })

  it('removes only a real note id, never the guide', async () => {
    file('one.md', headed('One', 'x'))
    await removeNote(root, 'one.md')
    await removeNote(root, 'CLAUDE.md')
    expect(existsSync(join(root, 'one.md'))).toBe(false)
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(true)
  })
})

describe('folders', () => {
  it('adds, renames and removes a folder, moving its notes with it', async () => {
    await addFolder(root, 'plans')
    file('plans/a.md', headed('A', 'a'))
    const renamed = await renameFolder(root, 'plans', 'ideas')
    expect(renamed.notes.map((one) => one.id)).toEqual(['ideas/a.md'])
    await removeNote(root, 'ideas/a.md')
    writeFileSync(join(root, 'ideas', '.DS_Store'), '')
    const gone = await removeFolder(root, 'ideas')
    expect(gone.folders).toEqual([])
  })

  it('refuses a folder named like the guide or the marker, or one that exists', async () => {
    expect((await addFolder(root, 'CLAUDE.md')).folders).toEqual([])
    expect((await addFolder(root, '.zetrem')).folders).toEqual([])
    await addFolder(root, 'a')
    expect((await addFolder(root, 'a')).folders).toEqual([{ name: 'a' }])
  })
})

describe('the guide', () => {
  it('writes itself back when the file is gone, so reading it always lands', async () => {
    rmSync(join(root, 'CLAUDE.md'))
    const guide = await readNote(root, 'CLAUDE.md')
    expect(guide?.body).toContain('볼트')
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(true)
  })
})

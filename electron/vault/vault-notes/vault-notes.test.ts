import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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
  isFolderName,
  isNoteId,
  isWritableId,
  leadOf,
  listFolders,
  listNotes,
  readNote,
  removeFolder,
  removeNote,
  renameFolder,
  renameNote,
  writeNote,
} from './vault-notes'

let root = ''
let outside = ''

function note(folder: string, name: string, text: string, atMs: number): void {
  mkdirSync(join(root, folder), { recursive: true })
  const path = join(root, folder, `${name}.md`)
  writeFileSync(path, text)
  utimesSync(path, atMs / 1000, atMs / 1000)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'zetrem-vault-notes-'))
  outside = mkdtempSync(join(tmpdir(), 'zetrem-vault-outside-'))
  for (const folder of ['분석', '수집자료', '산출물', '취향']) mkdirSync(join(root, folder))
  writeFileSync(join(root, 'CLAUDE.md'), '# guide\n')
  writeFileSync(join(root, '.zetrem'), '')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

describe('what counts as a note id', () => {
  it('is a markdown file directly inside one of the four folders', () => {
    expect(isNoteId('분석/배송API-비교.md')).toBe(true)
    expect(isNoteId('취향/a.md')).toBe(true)
  })

  it('refuses anything that could leave the vault or name the guide', () => {
    expect(isNoteId('CLAUDE.md')).toBe(false)
    expect(isNoteId('분석/../CLAUDE.md')).toBe(false)
    expect(isNoteId('분석/sub/x.md')).toBe(false)
    expect(isNoteId('/etc/passwd')).toBe(false)
    expect(isNoteId('분석/x.txt')).toBe(false)
    expect(isNoteId(42)).toBe(false)
  })
})

describe('the lead line', () => {
  it('is the first line with words on it, trimmed and capped', () => {
    expect(leadOf('\n\n  결론이다.  \n둘째 줄')).toBe('결론이다.')
    expect(leadOf('x'.repeat(300)).length).toBe(160)
    expect(leadOf('')).toBe('')
  })
})

describe('listing, reading and removing', () => {
  it('lists notes folder by folder, newest first inside a folder, guide and marker unseen', async () => {
    note('분석', 'older', 'old\n', 1_000)
    note('분석', 'newer', 'new lead\nmore', 2_000)
    note('취향', 'taste', 't\n', 3_000)
    const found = await listNotes(root)
    expect(found.notes.map((one) => one.id)).toEqual([
      '분석/newer.md',
      '분석/older.md',
      '취향/taste.md',
    ])
    expect(found.notes[0]).toEqual({
      id: '분석/newer.md',
      folder: '분석',
      title: 'newer',
      lead: 'new lead',
      updatedAtMs: 2_000,
    })
  })

  it('reads a note by id and answers null for an id that is not a note', async () => {
    note('산출물', 'thing', '# thing\nbody\n', 5_000)
    const read = await readNote(root, '산출물/thing.md')
    expect(read?.text).toBe('# thing\nbody\n')
    expect(read?.title).toBe('thing')
    expect(await readNote(root, '산출물/missing.md')).toBeNull()
    expect(await readNote(root, '../CLAUDE.md')).toBeNull()
  })

  it('removes only a real note id, and never the guide', async () => {
    note('수집자료', 'gone', 'x\n', 1)
    await removeNote(root, '수집자료/gone.md')
    expect(existsSync(join(root, '수집자료', 'gone.md'))).toBe(false)
    await removeNote(root, 'CLAUDE.md')
    await removeNote(root, '분석/../CLAUDE.md')
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(true)
  })

  it('does not follow a symlink that leaves the vault', async () => {
    const target = join(outside, 'secret.md')
    writeFileSync(target, 'secrets\n')
    symlinkSync(target, join(root, '분석', 'evil.md'))
    expect(await readNote(root, '분석/evil.md')).toBeNull()
    expect((await listNotes(root)).notes.map((one) => one.id)).not.toContain('분석/evil.md')
  })

  it('leaves out a file whose name is not a note id', async () => {
    writeFileSync(join(root, '분석', '..md'), 'sneaky\n')
    expect((await listNotes(root)).notes.map((one) => one.id)).toEqual([])
  })

  it('names every folder it knows, so an empty one is still a place', async () => {
    expect((await listNotes(root)).folders.map((one) => one.name)).toEqual([
      '분석',
      '산출물',
      '수집자료',
      '취향',
    ])
  })

  it('lists nothing when the vault is not there yet', async () => {
    expect((await listNotes(join(root, 'nope'))).notes).toEqual([])
  })
})

describe('folder names and the guide id', () => {
  it('takes a plain single segment and nothing that could climb or hide', () => {
    expect(isFolderName('기획')).toBe(true)
    expect(isFolderName('a b')).toBe(true)
    expect(isFolderName('')).toBe(false)
    expect(isFolderName(' x')).toBe(false)
    expect(isFolderName('.hidden')).toBe(false)
    expect(isFolderName('a/b')).toBe(false)
    expect(isFolderName('a\\b')).toBe(false)
    expect(isFolderName('..')).toBe(false)
    expect(isFolderName('x'.repeat(61))).toBe(false)
  })

  it('lets a note live in any folder that exists, and the guide be written but not removed', async () => {
    mkdirSync(join(root, '기획'))
    expect(isNoteId('기획/a.md')).toBe(true)
    expect(isWritableId('CLAUDE.md')).toBe(true)
    expect(isNoteId('CLAUDE.md')).toBe(false)
    await removeNote(root, 'CLAUDE.md')
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(true)
  })
})

describe('folders', () => {
  it('lists every folder by name, dotfiles unseen', async () => {
    mkdirSync(join(root, '기획'))
    mkdirSync(join(root, '.git'))
    const folders = await listFolders(root)
    expect(folders.map((one) => one.name)).toEqual(['기획', '분석', '산출물', '수집자료', '취향'])
  })

  it('adds, renames and removes a folder, moving its notes with it', async () => {
    let listing = await addFolder(root, '기획')
    expect(listing.folders.some((one) => one.name === '기획')).toBe(true)
    note('기획', 'plan', 'p\n', 1)
    listing = await renameFolder(root, '기획', '계획')
    expect(listing.notes.map((one) => one.id)).toContain('계획/plan.md')
    expect(existsSync(join(root, '기획'))).toBe(false)
    listing = await removeFolder(root, '계획')
    expect(listing.folders.some((one) => one.name === '계획')).toBe(true)
    await removeNote(root, '계획/plan.md')
    listing = await removeFolder(root, '계획')
    expect(listing.folders.some((one) => one.name === '계획')).toBe(false)
  })

  it('removes a folder that holds nothing but a .DS_Store', async () => {
    await addFolder(root, '기획')
    writeFileSync(join(root, '기획', '.DS_Store'), '')
    const listing = await removeFolder(root, '기획')
    expect(listing.folders.some((one) => one.name === '기획')).toBe(false)
    expect(existsSync(join(root, '기획'))).toBe(false)
  })

  it('refuses a folder named like the guide or the marker, or one that exists', async () => {
    await addFolder(root, 'CLAUDE.md')
    await addFolder(root, '.zetrem')
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(true)
    expect((await listFolders(root)).length).toBe(4)
    await renameFolder(root, '분석', '취향')
    expect(existsSync(join(root, '분석'))).toBe(true)
  })
})

describe('the guide', () => {
  it('writes itself back when the file is gone, so reading it always lands', async () => {
    rmSync(join(root, 'CLAUDE.md'))
    const guide = await readNote(root, 'CLAUDE.md')
    expect(guide?.text).toContain('분석/')
    expect(guide?.text).toContain('[[')
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(true)
  })
})

describe('writing', () => {
  it('writes a note and reads it back, and writes the guide too', async () => {
    note('분석', 'a', 'old\n', 1)
    const written = await writeNote(root, '분석/a.md', '# new\nbody\n')
    expect(written?.text).toBe('# new\nbody\n')
    expect(written?.lead).toBe('# new')
    const guide = await writeNote(root, 'CLAUDE.md', '# guide 2\n')
    expect(guide?.text).toBe('# guide 2\n')
    expect(await writeNote(root, '없는폴더/x.md', 'x')).toBeNull()
    expect(await writeNote(root, '../x.md', 'x')).toBeNull()
  })

  it('creates a note with a free name, numbering a collision', async () => {
    const first = await createNote(root, '분석', '새 노트')
    const second = await createNote(root, '분석', '새 노트')
    expect(first?.id).toBe('분석/새 노트.md')
    expect(second?.id).toBe('분석/새 노트 2.md')
    expect(second?.text).toBe('')
    expect(await createNote(root, '분석', 'a/b')).toBeNull()
    expect(await createNote(root, '없는폴더', 'x')).toBeNull()
  })

  it('writes nothing through a symlink, dangling or standing for a folder outside', async () => {
    symlinkSync(join(outside, 'gone.md'), join(root, '분석', 'dangling.md'))
    expect(await writeNote(root, '분석/dangling.md', 'x')).toBeNull()
    expect(existsSync(join(outside, 'gone.md'))).toBe(false)
    symlinkSync(outside, join(root, '바깥'))
    expect((await listFolders(root)).map((one) => one.name)).not.toContain('바깥')
    expect(await createNote(root, '바깥', 'x')).toBeNull()
    expect(existsSync(join(outside, 'x.md'))).toBe(false)
  })

  it('renames a note inside its folder and refuses a taken name', async () => {
    note('분석', 'a', 'x\n', 1)
    note('분석', 'b', 'y\n', 2)
    const moved = await renameNote(root, '분석/a.md', 'c')
    expect(moved?.id).toBe('분석/c.md')
    expect(existsSync(join(root, '분석', 'a.md'))).toBe(false)
    expect(await renameNote(root, '분석/c.md', 'b')).toBeNull()
    expect(existsSync(join(root, '분석', 'c.md'))).toBe(true)
    expect(await renameNote(root, 'CLAUDE.md', 'x')).toBeNull()
  })
})

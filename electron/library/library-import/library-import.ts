import { readFile, readdir, rm, rmdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { parseNote } from '@/entities/library/lib/frontmatter/frontmatter'
import { summaryOf } from '@/entities/library/lib/summary/summary'
import type { LibraryNote } from '@/entities/library/model/note'
import { putNote } from '../library-db/library-db'
import { isFolderName, isNoteId } from '../library-notes/library-notes'

// Earlier versions kept the library as markdown files in the project, next to
// a guide the app wrote for the agent. The guide was never a note, and neither
// is what a file browser leaves lying about.
const OWN_FILES = ['CLAUDE.md', '.DS_Store', 'Thumbs.db']

function stamp(iso: string, fallbackMs: number): number {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? Math.round(fallbackMs) : ms
}

async function noteFrom(root: string, id: string, folder: string): Promise<LibraryNote | null> {
  const path = join(root, id)
  try {
    const [info, text] = await Promise.all([stat(path), readFile(path, 'utf8')])
    const named = id.slice(folder.length === 0 ? 0 : folder.length + 1, -'.md'.length)
    const { meta, body } = parseNote(text)
    const title = meta === null || meta.title.length === 0 ? named : meta.title
    return {
      id,
      folder,
      title,
      summary: summaryOf(body),
      tags: meta?.tags ?? [],
      source: meta?.source ?? '',
      createdAtMs: stamp(meta?.created ?? '', info.birthtimeMs || info.mtimeMs),
      updatedAtMs: stamp(meta?.updated ?? '', info.mtimeMs),
      body,
    }
  } catch (cause: unknown) {
    console.error('[library] could not read a note the project kept', path, cause)
    return null
  }
}

async function idsIn(root: string, folders: string[]): Promise<{ id: string; folder: string }[]> {
  const out = (await readdir(root))
    .filter((name) => isNoteId(name) && !OWN_FILES.includes(name))
    .map((name) => ({ id: name, folder: '' }))
  for (const folder of folders) {
    const inner = await readdir(join(root, folder)).catch(() => [] as string[])
    for (const name of inner) {
      const id = `${folder}/${name}`
      if (isNoteId(id)) out.push({ id, folder })
    }
  }
  return out
}

async function foldersIn(root: string, entries: string[]): Promise<string[]> {
  const out: string[] = []
  for (const name of entries) {
    if (!isFolderName(name)) continue
    const dir = await stat(join(root, name)).catch(() => null)
    if (dir?.isDirectory() === true) out.push(name)
  }
  return out
}

// Only what the library now holds is taken off the disk, and the folders go
// only once they stand empty. A file that could not be read, or that was never
// a note, is left where the person can still see it.
async function clear(root: string, workspace: string, done: string[]): Promise<void> {
  const own = OWN_FILES.map((name) => join(root, name))
  await Promise.all(
    [...done, ...own].map((path) => rm(path, { force: true }).catch(() => undefined)),
  )
  const folders = await foldersIn(root, await readdir(root).catch(() => [] as string[]))
  for (const folder of folders) {
    await Promise.all(
      OWN_FILES.map((name) => rm(join(root, folder, name), { force: true }).catch(() => undefined)),
    )
    await rmdir(join(root, folder)).catch(() => undefined)
  }
  await rmdir(root).catch(() => undefined)
  await rmdir(join(workspace, '.zetrem')).catch(() => undefined)
}

// A library kept as files becomes a library kept in the app: the notes are read
// once, and what the project carried is cleared away behind them. Anything the
// library already holds under that id stays as it is.
export async function importOldNotes(db: DatabaseSync, workspace: string): Promise<number> {
  const root = join(workspace, '.zetrem', 'library')
  let entries: string[]
  try {
    entries = await readdir(root)
  } catch {
    return 0
  }
  const folders = await foldersIn(root, entries)
  const found = await idsIn(root, folders)
  const read = await Promise.all(found.map((one) => noteFrom(root, one.id, one.folder)))
  const notes = read.filter((one): one is LibraryNote => one !== null)

  const held = db.prepare('SELECT id FROM notes WHERE id = ?')
  const folder = db.prepare('INSERT INTO folders (name) VALUES (?) ON CONFLICT (name) DO NOTHING')
  let taken = 0
  db.exec('BEGIN')
  try {
    for (const name of folders) folder.run(name)
    for (const note of notes) {
      if (held.get(note.id) !== undefined) continue
      putNote(db, note)
      taken += 1
    }
    db.exec('COMMIT')
  } catch (cause: unknown) {
    db.exec('ROLLBACK')
    throw cause
  }
  await clear(
    root,
    workspace,
    notes.map((note) => join(root, note.id)),
  )
  return taken
}

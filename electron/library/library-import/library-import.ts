import { readFile, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { parseNote } from '@/entities/library/lib/frontmatter/frontmatter'
import { summaryOf } from '@/entities/library/lib/summary/summary'
import type { LibraryNote } from '@/entities/library/model/note'
import { putNote } from '../library-db/library-db'
import { isFolderName, isNoteId } from '../library-notes/library-notes'

// Earlier versions kept the library as markdown files in the project, next to
// a guide the app wrote for the agent. The guide was never a note.
const OWN_FILES = ['CLAUDE.md']

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
  } catch {
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

// A library kept as files becomes a library kept in the app: the notes are read
// once, and the folder the project carried goes with them. Anything the library
// already holds under that id stays as it is.
export async function importOldNotes(db: DatabaseSync, workspace: string): Promise<number> {
  const root = join(workspace, '.zetrem', 'library')
  let entries: string[]
  try {
    entries = await readdir(root)
  } catch {
    return 0
  }
  const folders: string[] = []
  for (const name of entries) {
    if (!isFolderName(name)) continue
    const dir = await stat(join(root, name)).catch(() => null)
    if (dir?.isDirectory() === true) folders.push(name)
  }
  const found = await idsIn(root, folders)
  const notes = (await Promise.all(found.map((one) => noteFrom(root, one.id, one.folder)))).filter(
    (one): one is LibraryNote => one !== null,
  )

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
  await rm(join(workspace, '.zetrem'), { recursive: true, force: true })
  return taken
}

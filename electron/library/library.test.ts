import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryListing, LibraryNote } from '@/entities/library/model/note'

const boundary = vi.hoisted(() => ({
  userData: '',
  handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
  told: 0,
}))

vi.mock('electron', () => ({
  app: { getPath: () => boundary.userData },
  BrowserWindow: { getAllWindows: () => [{ webContents: {} }] },
}))
vi.mock('../ipc/ipc', () => ({
  handle: (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
    boundary.handlers.set(channel, fn)
  },
  push: () => {
    boundary.told += 1
  },
}))
vi.mock('../store/project-memory/project-memory', () => ({ recallProject: async () => null }))

import { libraryDbFile, openLibraryDb } from './library-db/library-db'
import { listNotes } from './library-notes/library-notes'
import { closeLibraries, closeLibraryMcp, librarySessionArgs, registerLibrary } from './library'

let workspace = ''
let userData = ''

// The app resolves a workspace with fsPromises.realpath, which carries the
// semantics of realpath.native: on Windows it expands 8.3 short names, where
// the plain realpathSync leaves them be. The tests must resolve the same way,
// or they hash a different path and watch a different file.
function resolved(where: string): string {
  return realpathSync.native(where)
}

// No project is picked in these tests, so the screen works in the scratch
// workspace the app keeps for exactly that.
function scratch(): string {
  return resolved(join(userData, 'agent-workspace'))
}

function fileFor(where: string): string {
  return libraryDbFile(userData, resolved(where))
}

function held(where: string): LibraryListing {
  const db = openLibraryDb(fileFor(where), where)
  try {
    return listNotes(db)
  } finally {
    db.close()
  }
}

async function ask<T>(channel: string, ...args: unknown[]): Promise<T> {
  const handler = boundary.handlers.get(channel)
  if (handler === undefined) throw new Error(`nothing handles ${channel}`)
  return (await handler({}, ...args)) as T
}

function call(library: { url: string; headers: { Authorization: string } }, body: unknown) {
  return fetch(library.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: library.headers.Authorization,
    },
    body: JSON.stringify(body),
  })
}

function serverIn(args: string[]): {
  type: string
  url: string
  headers: { Authorization: string }
} {
  return JSON.parse(args[1] as string).mcpServers.library
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'zetrem-ws-'))
  userData = mkdtempSync(join(tmpdir(), 'zetrem-ud-'))
  boundary.userData = userData
  boundary.told = 0
  boundary.handlers.clear()
  registerLibrary()
})

afterEach(async () => {
  await closeLibraryMcp()
  closeLibraries()
  rmSync(workspace, { recursive: true, force: true })
  rmSync(userData, { recursive: true, force: true })
})

describe('where a library is kept', () => {
  it('holds the notes in the app, under a file named after the project', async () => {
    await librarySessionArgs(workspace)
    expect(existsSync(fileFor(workspace))).toBe(true)
    expect(existsSync(join(workspace, '.zetrem'))).toBe(false)
  })

  it('sweeps away the derived index an earlier version kept beside it', async () => {
    const stale = join(userData, 'library-index')
    mkdirSync(stale, { recursive: true })
    writeFileSync(join(stale, 'abc.sqlite'), 'stale')
    await librarySessionArgs(workspace)
    expect(existsSync(stale)).toBe(false)
  })

  it('keeps a file that is not a database aside rather than throwing it away', async () => {
    await librarySessionArgs(workspace)
    closeLibraries()
    writeFileSync(fileFor(workspace), 'not a database')
    await librarySessionArgs(workspace)
    const kept = readdirSync(join(userData, 'library')).filter((name) => name.includes('.broken-'))
    expect(kept).toHaveLength(1)
    expect(readFileSync(join(userData, 'library', kept[0] as string), 'utf8')).toBe(
      'not a database',
    )
    expect(held(workspace).notes).toEqual([])
  })

  it('pushes nothing aside when the trouble is not the file itself', async () => {
    // A directory standing where the file should be cannot be opened either,
    // but nothing about it says the notes are rubble.
    mkdirSync(fileFor(workspace), { recursive: true })
    await expect(librarySessionArgs(workspace)).rejects.toThrow()
    expect(readdirSync(join(userData, 'library')).some((name) => name.includes('.broken'))).toBe(
      false,
    )
  })
})

describe('a library the project kept as files', () => {
  it('is taken into the app the first time it is opened, and the folder goes', async () => {
    const root = join(workspace, '.zetrem', 'library')
    mkdirSync(join(root, 'plans'), { recursive: true })
    writeFileSync(
      join(root, 'plans', 'auth.md'),
      '---\ntitle: Auth\ntags: [chosen]\n---\nWe went with sessions.\n',
    )
    await librarySessionArgs(workspace)
    const listing = held(workspace)
    expect(listing.folders).toEqual([{ name: 'plans' }])
    expect(listing.notes.map((one) => one.id)).toEqual(['plans/auth.md'])
    expect(existsSync(join(workspace, '.zetrem'))).toBe(false)
  })
})

describe('what a session is handed', () => {
  it('adds an MCP config that points at a live server, and no directory', async () => {
    const args = await librarySessionArgs(workspace)
    expect(args).toHaveLength(2)
    expect(args[0]).toBe('--mcp-config')
    const library = serverIn(args)
    expect(library.type).toBe('http')
    expect(library.headers.Authorization).toMatch(/^Bearer /)
    const reply = await call(library, { jsonrpc: '2.0', id: 1, method: 'tools/list' })
    const body = (await reply.json()) as { result: { tools: { name: string }[] } }
    expect(body.result.tools.map((one) => one.name)).toContain('library_search')
    const hello = await call(library, { jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    const said = (await hello.json()) as { result: { instructions: string } }
    expect(said.result.instructions).toContain('library_search')
  })

  // The screen works in the scratch workspace while no project is picked, so a
  // suggestion the screen is meant to see has to be raised in that same library.
  async function propose(title = 'From the agent'): Promise<void> {
    await ask('library:list')
    const library = serverIn(await librarySessionArgs(scratch()))
    const reply = await call(library, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'library_write',
        arguments: { title, body: 'It learned this.', tags: ['probe'] },
      },
    })
    const body = (await reply.json()) as { result: { isError?: boolean } }
    expect(body.result.isError).toBeUndefined()
  }

  it('only proposes through the tool: the library is untouched until a person says so', async () => {
    await propose()
    expect(held(scratch()).notes).toEqual([])
    const waiting = await ask<{ id: string; title: string; tags: string[] }[]>('library:proposals')
    expect(waiting).toHaveLength(1)
    expect(waiting[0]).toMatchObject({ title: 'From the agent', tags: ['probe'], folder: '' })
    expect(boundary.told).toBeGreaterThan(0)
  })

  it('writes the note the moment the person accepts, and stops waiting', async () => {
    await propose()
    const [waiting] = await ask<{ id: string }[]>('library:proposals')
    const note = await ask<LibraryNote | null>('library:proposal-accept', waiting?.id)
    expect(note).toMatchObject({ id: 'From the agent.md', tags: ['probe'], source: 'agent' })
    expect(held(scratch()).notes.map((one) => one.id)).toEqual(['From the agent.md'])
    expect(await ask('library:proposals')).toEqual([])
  })

  it('drops the suggestion the person waves off, writing nothing', async () => {
    await propose()
    const [waiting] = await ask<{ id: string }[]>('library:proposals')
    await ask('library:proposal-dismiss', waiting?.id)
    expect(await ask('library:proposals')).toEqual([])
    expect(held(scratch()).notes).toEqual([])
  })

  it('finds through the tool what the screen wrote, since both work in one library', async () => {
    const created = await ask<LibraryNote | null>('library:create', null, 'Auth choice')
    await ask('library:write', created?.id, 'We went with sessions.')
    const library = serverIn(await librarySessionArgs(scratch()))
    const reply = await call(library, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'library_search', arguments: { query: 'sessions' } },
    })
    const body = (await reply.json()) as { result: { isError?: true; content: { text: string }[] } }
    expect(body.result.isError).toBeUndefined()
    const hits = JSON.parse(body.result.content[0]?.text ?? '[]') as { id: string }[]
    expect(hits.map((hit) => hit.id)).toEqual(['Auth choice.md'])
  })

  it('closes the server of a library no session will reach again', async () => {
    const other = mkdtempSync(join(tmpdir(), 'zetrem-ws-'))
    try {
      const first = serverIn(await librarySessionArgs(workspace))
      await librarySessionArgs(other)
      const reply = await call(first, { jsonrpc: '2.0', id: 1, method: 'ping' }).catch(() => null)
      expect(reply).toBeNull()
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  it('starts one server for the whole app and reuses it', async () => {
    const first = await librarySessionArgs(workspace)
    const second = await librarySessionArgs(workspace)
    expect(second[1]).toBe(first[1])
  })
})

describe('what the screen asks for', () => {
  it('creates, writes, reads and lists a note in the workspace library', async () => {
    const made = await ask<LibraryNote | null>('library:create', null, 'Idea')
    expect(made).toMatchObject({ id: 'Idea.md', title: 'Idea', source: '' })
    await ask('library:write', 'Idea.md', 'The body.', { tags: ['t'] })
    const listing = await ask<LibraryListing>('library:list')
    expect(listing.notes).toEqual([
      expect.objectContaining({ id: 'Idea.md', tags: ['t'], summary: 'The body.' }),
    ])
    expect(await ask<LibraryNote | null>('library:read', 'Idea.md')).toMatchObject({
      body: 'The body.',
    })
    expect(held(scratch()).notes.map((one) => one.id)).toEqual(['Idea.md'])
  })

  it('searches, follows a link back, and files an answer', async () => {
    await ask('library:create', null, 'Target')
    const from = await ask<LibraryNote | null>('library:create', null, 'Source')
    await ask('library:write', from?.id, 'see [[Target]] for the reason')
    expect((await ask<{ id: string }[]>('library:search', 'reason')).map((one) => one.id)).toEqual([
      'Source.md',
    ])
    expect(
      (await ask<{ id: string }[]>('library:backlinks', 'Target.md')).map((one) => one.id),
    ).toEqual(['Source.md'])
    const filed = await ask<LibraryNote | null>('library:file', '## Found\n\nThe probe runs empty.')
    expect(filed).toMatchObject({ id: 'Found.md', summary: 'The probe runs empty.' })
  })

  it('adds, renames and removes a folder, and removes a note', async () => {
    expect((await ask<LibraryListing>('library:folder-add', 'plans')).folders).toEqual([
      { name: 'plans' },
    ])
    await ask('library:create', 'plans', 'Idea')
    const moved = await ask<LibraryListing>('library:folder-rename', 'plans', 'ideas')
    expect(moved.notes.map((one) => one.id)).toEqual(['ideas/Idea.md'])
    await ask('library:remove', 'ideas/Idea.md')
    expect((await ask<LibraryListing>('library:folder-remove', 'ideas')).folders).toEqual([])
    expect((await ask<LibraryListing>('library:list')).notes).toEqual([])
  })

  it('renames a note and keeps the switch that says who may read the library', async () => {
    await ask('library:create', null, 'One')
    expect(await ask<LibraryNote | null>('library:rename', 'One.md', 'Uno')).toMatchObject({
      id: 'Uno.md',
    })
    expect(await ask<boolean>('library:agents')).toBe(true)
    expect(await ask<boolean>('library:agents-set', false)).toBe(false)
    expect(await ask<boolean>('library:agents')).toBe(false)
  })
})

describe('when a project has closed its library to agents', () => {
  it('hands the session nothing, so the agent gets no tools at all', async () => {
    const { setLibraryOpenToAgents } = await import('./library-access/library-access')
    await setLibraryOpenToAgents(workspace, false)
    expect(await librarySessionArgs(workspace)).toEqual([])
    await setLibraryOpenToAgents(workspace, true)
    expect(await librarySessionArgs(workspace)).toHaveLength(2)
  })
})

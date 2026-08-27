import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => process.env.ZT_TEST_USERDATA ?? '' },
  BrowserWindow: { getAllWindows: () => [] },
}))
vi.mock('../ipc/ipc', () => ({ handle: () => undefined, push: () => undefined }))
vi.mock('../store/project-memory/project-memory', () => ({ recallProject: async () => null }))

import {
  closeLibraryMcp,
  ensureLibrary,
  stopFollowing,
  libraryRootFor,
  librarySessionArgs,
} from './library'

let workspace = ''
let userData = ''

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'zetrem-ws-'))
  userData = mkdtempSync(join(tmpdir(), 'zetrem-ud-'))
  process.env.ZT_TEST_USERDATA = userData
})

afterEach(async () => {
  await closeLibraryMcp()
  stopFollowing()
  rmSync(workspace, { recursive: true, force: true })
  rmSync(userData, { recursive: true, force: true })
})

describe('where the library lives', () => {
  it('sits inside the workspace, so it moves with the project', () => {
    expect(libraryRootFor('/w/proj')).toBe(join('/w/proj', '.zetrem', 'library'))
  })
})

describe('laying the skeleton', () => {
  it('creates the root and writes no file of its own into the project', async () => {
    const root = libraryRootFor(workspace)
    await ensureLibrary(root)
    expect(readdirSync(root)).toEqual([])
  })

  it('sweeps away the CLAUDE.md and the marker an earlier version wrote there', async () => {
    const root = libraryRootFor(workspace)
    await ensureLibrary(root)
    writeFileSync(join(root, 'CLAUDE.md'), '# 라이브러리\n')
    writeFileSync(join(root, '.zetrem'), '')
    await ensureLibrary(root)
    expect(readdirSync(root)).toEqual([])
  })
})

describe('what a session is handed', () => {
  it('adds the library as a directory and an MCP config that points at a live server', async () => {
    const args = await librarySessionArgs(workspace)
    expect(args.slice(0, 2)).toEqual(['--add-dir', libraryRootFor(workspace)])
    expect(args[2]).toBe('--mcp-config')
    const config = JSON.parse(args[3] as string)
    const library = config.mcpServers.library
    expect(library.type).toBe('http')
    expect(library.headers.Authorization).toMatch(/^Bearer /)
    const reply = await fetch(library.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: library.headers.Authorization,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
    const body = (await reply.json()) as { result: { tools: { name: string }[] } }
    expect(body.result.tools.map((one) => one.name)).toContain('library_search')
    const hello = await fetch(library.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: library.headers.Authorization,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} }),
    })
    const said = (await hello.json()) as { result: { instructions: string } }
    expect(said.result.instructions).toContain('library_search')
  })

  it("marks a note written through the tool as the agent's, and a person's as their own", async () => {
    const args = await librarySessionArgs(workspace)
    const config = JSON.parse(args[3] as string)
    const library = config.mcpServers.library
    await fetch(library.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: library.headers.Authorization,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'library_write', arguments: { title: 'by agent', body: 'x' } },
      }),
    })
    const { createNote, listNotes } = await import('./library-notes/library-notes')
    await createNote(libraryRootFor(workspace), '', 'by hand')
    const { notes } = await listNotes(libraryRootFor(workspace))
    expect(notes.find((one) => one.title === 'by agent')?.source).toBe('agent')
    expect(notes.find((one) => one.title === 'by hand')?.source).toBe('')
  })

  it('writes an agent note through the tool, into this workspace', async () => {
    const args = await librarySessionArgs(workspace)
    const library = JSON.parse(args[3] as string).mcpServers.library
    const reply = await fetch(library.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: library.headers.Authorization,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'library_write',
          arguments: { title: 'From the agent', body: 'It learned this.', tags: ['probe'] },
        },
      }),
    })
    const body = (await reply.json()) as {
      result: { isError?: boolean; content: { text: string }[] }
    }
    expect(body.result.isError).toBeUndefined()
    const written = readFileSync(join(libraryRootFor(workspace), 'From the agent.md'), 'utf8')
    expect(written).toMatch(/^tags: \[probe\]$/m)
    expect(written).toContain('It learned this.')
  })

  it('starts one server for the whole app and reuses it', async () => {
    const first = await librarySessionArgs(workspace)
    const second = await librarySessionArgs(workspace)
    expect(second[3]).toBe(first[3])
  })
})

describe('when a project has closed its library to agents', () => {
  it('hands the session nothing, so the agent never sees the folder or the tools', async () => {
    const { setLibraryOpenToAgents } = await import('./library-access/library-access')
    await setLibraryOpenToAgents(workspace, false)
    expect(await librarySessionArgs(workspace)).toEqual([])
    await setLibraryOpenToAgents(workspace, true)
    expect((await librarySessionArgs(workspace)).length).toBe(4)
  })
})

import { connect } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mcpConfigFor, startLibraryMcp } from './library-mcp'
import type { LibraryMcp, LibraryTools } from './library-mcp.types'

type Call = { tool: string; args: unknown[] }

const summary = {
  id: 'analysis/auth.md',
  folder: 'analysis',
  title: 'auth',
  summary: 'Tokens live in the keychain.',
  tags: ['auth'],
  source: '',
  createdAtMs: 1,
  updatedAtMs: 2,
}
const note = { ...summary, body: 'Tokens live in the keychain.\n\nMore.' }

const proposal = {
  id: 'a1',
  folder: 'analysis',
  title: 'auth',
  body: 'Tokens.',
  tags: ['a'],
  proposedAtMs: 3,
}

function fakeTools(calls: Call[]): LibraryTools {
  return {
    async search(query, limit) {
      calls.push({ tool: 'search', args: [query, limit] })
      return [{ ...summary, snippet: 'the keychain' }]
    },
    async read(id) {
      calls.push({ tool: 'read', args: [id] })
      return id === note.id ? (note as never) : null
    },
    async write(input) {
      calls.push({ tool: 'write', args: [input] })
      return proposal
    },
    async recent(limit) {
      calls.push({ tool: 'recent', args: [limit] })
      return [summary as never]
    },
  }
}

let server: LibraryMcp
let calls: Call[]

beforeEach(async () => {
  calls = []
  server = await startLibraryMcp(fakeTools(calls))
})

afterEach(async () => {
  await server.close().catch(() => undefined)
})

const post = (body: unknown, headers: Record<string, string> = {}, path = '/mcp') =>
  fetch(server.url.replace('/mcp', path), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${server.token}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const rpc = (method: string, params?: unknown, id: number | string = 1) =>
  post({ jsonrpc: '2.0', id, method, params })

async function callTool(name: string, args?: unknown) {
  const res = await rpc('tools/call', { name, arguments: args })
  const body = (await res.json()) as { result: { content: { text: string }[]; isError?: true } }
  return body.result
}

describe('the door', () => {
  it('listens on the loopback with a random port and a base64url token', () => {
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/)
    expect(server.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('turns away a missing or wrong bearer token with 401', async () => {
    const bare = await fetch(server.url, { method: 'POST', body: '{}' })
    expect(bare.status).toBe(401)
    const wrong = await post({}, { authorization: 'Bearer nope' })
    expect(wrong.status).toBe(401)
  })

  it('turns away a browser origin with 403 but lets loopback origins through', async () => {
    expect((await post({}, { origin: 'https://evil.example' })).status).toBe(403)
    expect((await post({}, { origin: 'http://localhost:5173' })).status).toBe(202)
    expect((await post({}, { origin: 'http://127.0.0.1' })).status).toBe(202)
  })

  it('knows only /mcp, and only POST', async () => {
    expect((await post({}, {}, '/other')).status).toBe(404)
    const headers = { authorization: `Bearer ${server.token}` }
    expect((await fetch(server.url, { headers })).status).toBe(405)
    expect((await fetch(server.url, { method: 'DELETE', headers })).status).toBe(405)
  })

  it('refuses a protocol version it does not speak', async () => {
    const res = await rpc('ping', undefined, 1).then(() =>
      post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': '1999-01-01' }),
    )
    expect(res.status).toBe(400)
  })

  it('caps the body at 1 MiB', async () => {
    const res = await post('x'.repeat(1024 * 1024 + 1)).catch(() => ({ status: 413 }))
    expect(res.status).toBe(413)
  })
})

describe('the handshake', () => {
  it('answers initialize with the negotiated version and a session id', async () => {
    const res = await rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('mcp-session-id')).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(await res.json()).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'library', version: expect.any(String) },
        instructions: expect.stringContaining('library_write'),
      },
    })
  })

  it('falls back to the latest version it speaks when the client asks for a stranger', async () => {
    const res = await rpc('initialize', { protocolVersion: '2030-01-01' })
    const body = (await res.json()) as { result: { protocolVersion: string } }
    expect(body.result.protocolVersion).toBe('2025-06-18')
  })

  it('accepts a notification with an empty 202', async () => {
    const res = await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })

  it('answers ping with an empty result', async () => {
    expect(await (await rpc('ping')).json()).toEqual({ jsonrpc: '2.0', id: 1, result: {} })
  })

  it('names the four tools with schemas an agent can read', async () => {
    const body = (await (await rpc('tools/list')).json()) as {
      result: { tools: { name: string; description: string; inputSchema: { type: string } }[] }
    }
    expect(body.result.tools.map((tool) => tool.name)).toEqual([
      'library_search',
      'library_read',
      'library_write',
      'library_recent',
    ])
    for (const tool of body.result.tools) {
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.inputSchema.type).toBe('object')
    }
  })
})

describe('the tools', () => {
  it('searches with the given limit and returns the hits as JSON text', async () => {
    const result = await callTool('library_search', { query: 'keychain', limit: 3 })
    expect(calls).toEqual([{ tool: 'search', args: ['keychain', 3] }])
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0]!.text)).toEqual([{ ...summary, snippet: 'the keychain' }])
  })

  it('searches with a default limit when none is given', async () => {
    await callTool('library_search', { query: 'x' })
    expect(calls[0]!.args[1]).toBe(10)
  })

  it('reads a note as JSON and reports a missing one as an error result', async () => {
    const found = await callTool('library_read', { id: note.id })
    expect(JSON.parse(found.content[0]!.text)).toEqual(note)
    const missing = await callTool('library_read', { id: 'nope.md' })
    expect(missing.isError).toBe(true)
    expect(missing.content[0]!.text).toContain('no such note')
  })

  it('proposes rather than writes, and says the note is not in the library yet', async () => {
    const input = { title: 'auth', body: 'Tokens.', tags: ['a'], folder: 'analysis' }
    const result = await callTool('library_write', input)
    expect(calls).toEqual([{ tool: 'write', args: [input] }])
    expect(result.isError).toBeUndefined()
    expect(result.content[0]!.text).toBe(
      'Proposed "auth" to the person. It is not in the library until they accept it — do not assume it was.',
    )
  })

  it('tells an agent up front that library_write only suggests', async () => {
    const body = (await (await rpc('tools/list')).json()) as {
      result: { tools: { name: string; description: string }[] }
    }
    const write = body.result.tools.find((tool) => tool.name === 'library_write')
    expect(write?.description).toContain('Propose')
    expect(write?.description).toContain('nothing is saved until they accept')
  })

  it('lists recent notes', async () => {
    const result = await callTool('library_recent', { limit: 5 })
    expect(calls).toEqual([{ tool: 'recent', args: [5] }])
    expect(JSON.parse(result.content[0]!.text)).toEqual([summary])
  })

  it('answers bad arguments with an error result, never a JSON-RPC error', async () => {
    const cases: [string, unknown][] = [
      ['library_search', {}],
      ['library_search', { query: 'x', limit: 0 }],
      ['library_search', { query: 'x', limit: 51 }],
      ['library_search', { query: 'x', limit: 1.5 }],
      ['library_read', { id: 3 }],
      ['library_write', { title: 'x' }],
      ['library_write', { title: 'x', body: 'y', tags: 'a' }],
      ['library_write', { title: 'x', body: 'y', folder: 1 }],
      ['library_recent', { limit: -1 }],
      ['library_nope', {}],
    ]
    for (const [name, args] of cases) {
      const result = await callTool(name, args)
      expect(result.isError, `${name} ${JSON.stringify(args)}`).toBe(true)
      expect(result.content[0]!.text).not.toBe('')
    }
    expect(calls).toEqual([])
  })
})

describe('the protocol edges', () => {
  it('answers an unknown method with -32601', async () => {
    const body = (await (await rpc('resources/list')).json()) as { error: { code: number } }
    expect(body.error.code).toBe(-32601)
  })

  it('answers malformed JSON with 400 and -32700', async () => {
    const res = await post('{not json')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: number }; id: null }
    expect(body.error.code).toBe(-32700)
    expect(body.id).toBeNull()
  })

  it('frees the port on close', async () => {
    const port = Number(new URL(server.url).port)
    await server.close()
    const refused = await new Promise<boolean>((resolve) => {
      const socket = connect(port, '127.0.0.1')
      socket.once('error', () => resolve(true))
      socket.once('connect', () => {
        socket.destroy()
        resolve(false)
      })
    })
    expect(refused).toBe(true)
  })
})

describe('the config handed to the CLI', () => {
  it('names the server, its url and the bearer header', () => {
    expect(JSON.parse(mcpConfigFor(server))).toEqual({
      mcpServers: {
        library: {
          type: 'http',
          url: server.url,
          headers: { Authorization: `Bearer ${server.token}` },
        },
      },
    })
    expect(Object.keys(JSON.parse(mcpConfigFor(server, 'notes')).mcpServers)).toEqual(['notes'])
  })
})

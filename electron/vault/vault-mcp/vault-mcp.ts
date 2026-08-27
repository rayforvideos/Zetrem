import { randomBytes } from 'node:crypto'
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type {
  HttpReply,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
  ToolDef,
  ToolResult,
  VaultMcp,
  VaultTools,
  VaultWriteInput,
} from './vault-mcp.types'

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const DEFAULT_PROTOCOL = '2025-06-18'
const SERVER_VERSION = '1.0.0'
const MAX_BODY_BYTES = 1024 * 1024
const MAX_SEARCH_LIMIT = 50

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601

const TOOLS: ToolDef[] = [
  {
    name: 'vault_search',
    description:
      "Full-text search over the project's vault of markdown notes. Use it before answering questions about the project, its decisions or its history: earlier sessions may already have written the answer down. Returns matching notes with a snippet around the match.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to look for in titles and bodies.' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_SEARCH_LIMIT,
          description: 'Most hits to return, default 10.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'vault_read',
    description:
      'Read one vault note in full by its id (the path a search or recent result gave you). Use it when a snippet is not enough.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Note id, e.g. "analysis/auth.md".' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'vault_write',
    description:
      'Write a new markdown note into the vault. Use it to keep a conclusion, a decision or a finding that a later session should not have to rediscover. One conclusion per note; link related notes with [[title]].',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title, also the file name.' },
        body: { type: 'string', description: 'Markdown body. Put the conclusion first.' },
        tags: { type: 'array', items: { type: 'string' } },
        folder: { type: 'string', description: 'Folder inside the vault; the root when omitted.' },
      },
      required: ['title', 'body'],
      additionalProperties: false,
    },
  },
  {
    name: 'vault_recent',
    description:
      'List the most recently updated vault notes. Use it at the start of a task to see what the project has been working on lately.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, description: 'Most notes to return, default 10.' },
      },
      additionalProperties: false,
    },
  },
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOptionalLimit = (
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): value is number | undefined =>
  value === undefined ||
  (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max)

const text = (value: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) }],
})

const failure = (message: string): ToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
})

async function callSearch(tools: VaultTools, args: Record<string, unknown>): Promise<ToolResult> {
  if (typeof args.query !== 'string') return failure('vault_search needs a string "query"')
  if (!isOptionalLimit(args.limit, MAX_SEARCH_LIMIT)) {
    return failure(`vault_search "limit" must be an integer from 1 to ${MAX_SEARCH_LIMIT}`)
  }
  return text(await tools.search(args.query, args.limit ?? 10))
}

async function callRead(tools: VaultTools, args: Record<string, unknown>): Promise<ToolResult> {
  if (typeof args.id !== 'string') return failure('vault_read needs a string "id"')
  const note = await tools.read(args.id)
  return note ? text(note) : failure(`no such note: ${args.id}`)
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((one) => typeof one === 'string')

function writeInput(args: Record<string, unknown>): VaultWriteInput | string {
  if (typeof args.title !== 'string') return 'vault_write needs a string "title"'
  if (typeof args.body !== 'string') return 'vault_write needs a string "body"'
  if (args.tags !== undefined && !isStringArray(args.tags)) {
    return 'vault_write "tags" must be an array of strings'
  }
  if (args.folder !== undefined && typeof args.folder !== 'string') {
    return 'vault_write "folder" must be a string'
  }
  const input: VaultWriteInput = { title: args.title, body: args.body }
  if (args.tags !== undefined) input.tags = args.tags
  if (args.folder !== undefined) input.folder = args.folder
  return input
}

async function callWrite(tools: VaultTools, args: Record<string, unknown>): Promise<ToolResult> {
  const input = writeInput(args)
  if (typeof input === 'string') return failure(input)
  const note = await tools.write(input)
  if (!note) return failure('the note could not be written')
  // The summary is the note without its body; the entity's field names are settling.
  const {
    body: _body,
    text: _text,
    session: _session,
    ...summary
  } = note as Record<string, unknown>
  return text(summary)
}

async function callRecent(tools: VaultTools, args: Record<string, unknown>): Promise<ToolResult> {
  if (!isOptionalLimit(args.limit))
    return failure('vault_recent "limit" must be a positive integer')
  return text(await tools.recent(args.limit ?? 10))
}

async function callTool(tools: VaultTools, params: unknown): Promise<ToolResult> {
  if (!isRecord(params) || typeof params.name !== 'string')
    return failure('tools/call needs a "name"')
  const args = params.arguments === undefined ? {} : params.arguments
  if (!isRecord(args)) return failure('"arguments" must be an object')
  switch (params.name) {
    case 'vault_search':
      return callSearch(tools, args)
    case 'vault_read':
      return callRead(tools, args)
    case 'vault_write':
      return callWrite(tools, args)
    case 'vault_recent':
      return callRecent(tools, args)
    default:
      return failure(`unknown tool: ${params.name}`)
  }
}

function negotiateProtocol(params: unknown): string {
  const asked = isRecord(params) ? params.protocolVersion : undefined
  return typeof asked === 'string' && PROTOCOL_VERSIONS.includes(asked) ? asked : DEFAULT_PROTOCOL
}

const ok = (id: JsonRpcId, result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result })
const err = (id: JsonRpcId, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

async function dispatch(
  tools: VaultTools,
  name: string,
  request: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  const id = request.id as JsonRpcId
  switch (request.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: negotiateProtocol(request.params),
        capabilities: { tools: {} },
        serverInfo: { name, version: SERVER_VERSION },
      })
    case 'ping':
      return ok(id, {})
    case 'tools/list':
      return ok(id, { tools: TOOLS })
    case 'tools/call':
      return ok(id, await callTool(tools, request.params))
    default:
      return err(id, METHOD_NOT_FOUND, `method not found: ${String(request.method)}`)
  }
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}): HttpReply => ({
  status,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

const LOCAL_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        resolve(null)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function gate(req: IncomingMessage, token: string): HttpReply | null {
  if (req.headers.authorization !== `Bearer ${token}`) return { status: 401 }
  const origin = req.headers.origin
  if (origin !== undefined && !LOCAL_ORIGIN.test(origin)) return { status: 403 }
  if (req.url !== '/mcp') return { status: 404 }
  if (req.method !== 'POST') return { status: 405, headers: { allow: 'POST' } }
  const version = req.headers['mcp-protocol-version']
  if (version !== undefined && !PROTOCOL_VERSIONS.includes(String(version))) return { status: 400 }
  return null
}

async function handlePost(tools: VaultTools, name: string, body: string): Promise<HttpReply> {
  let message: unknown
  try {
    message = JSON.parse(body)
  } catch {
    return json(400, err(null, PARSE_ERROR, 'parse error'))
  }
  if (!isRecord(message))
    return json(400, err(null, INVALID_REQUEST, 'expected one JSON-RPC message'))
  const request = message as JsonRpcRequest
  if (request.id === undefined || request.id === null) return { status: 202 }
  const response = await dispatch(tools, name, request)
  const headers: Record<string, string> =
    request.method === 'initialize' ? { 'mcp-session-id': randomToken() } : {}
  return json(200, response, headers)
}

const randomToken = (): string => randomBytes(32).toString('base64url')

function send(res: ServerResponse, reply: HttpReply): void {
  res.writeHead(reply.status, reply.headers)
  res.end(reply.body)
}

async function handle(
  tools: VaultTools,
  name: string,
  token: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const refused = gate(req, token)
  if (refused) return send(res, refused)
  const body = await readBody(req)
  if (body === null) return send(res, { status: 413 })
  send(res, await handlePost(tools, name, body))
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port))
  })
}

export async function startVaultMcp(tools: VaultTools, name = 'vault'): Promise<VaultMcp> {
  const token = randomToken()
  const server = createServer((req, res) => {
    handle(tools, name, token, req, res).catch(() => send(res, { status: 500 }))
  })
  const port = await listen(server)
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    token,
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

export function mcpConfigFor(server: VaultMcp, name = 'vault'): string {
  return JSON.stringify({
    mcpServers: {
      [name]: {
        type: 'http',
        url: server.url,
        headers: { Authorization: `Bearer ${server.token}` },
      },
    },
  })
}

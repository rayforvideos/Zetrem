import type { LibraryHit, LibraryNote, LibraryNoteSummary } from '@/entities/library/model/note'
import type { LibraryProposal } from '@/entities/library/model/proposal'

export type LibraryWriteInput = {
  title: string
  body: string
  tags?: string[]
  folder?: string
  // A teammate's name, as the person knows it, when the caller is one.
  by?: string
}

// What a proposal is refused for, so the MCP layer can word the refusal
// instead of saying only that "the note could not be written".
type LibraryWriteRefusal = { ok: false; why: 'title' | 'folder' }

type LibraryWriteResult = { ok: true; proposal: LibraryProposal } | LibraryWriteRefusal

// What a tool call carries about where it came from, read off the request
// rather than trusted from the agent: the header the MCP server validated.
export type LibraryCallContext = { session: string }

export type LibraryTools = {
  search(query: string, limit: number): Promise<LibraryHit[]>
  read(id: string): Promise<LibraryNote | null>
  // A write only asks. What comes back is the ask, waiting for the person, or
  // the reason it was refused before it ever became one.
  write(input: LibraryWriteInput, context: LibraryCallContext): Promise<LibraryWriteResult>
  recent(limit: number): Promise<LibraryNoteSummary[]>
}

export type LibraryMcp = { url: string; token: string; close(): Promise<void> }

export type JsonRpcId = string | number | null

export type JsonRpcRequest = {
  jsonrpc?: unknown
  id?: JsonRpcId
  method?: unknown
  params?: unknown
}

type JsonRpcError = { code: number; message: string }

export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: JsonRpcError }

export type ToolResult = { content: { type: 'text'; text: string }[]; isError?: true }

export type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown> }

export type HttpReply = { status: number; headers?: Record<string, string>; body?: string }

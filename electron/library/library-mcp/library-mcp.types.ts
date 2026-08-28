import type { LibraryHit, LibraryNote, LibraryNoteSummary } from '@/entities/library/model/note'

export type LibraryWriteInput = { title: string; body: string; tags?: string[]; folder?: string }

export type LibraryTools = {
  search(query: string, limit: number): Promise<LibraryHit[]>
  read(id: string): Promise<LibraryNote | null>
  write(input: LibraryWriteInput): Promise<LibraryNote | null>
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

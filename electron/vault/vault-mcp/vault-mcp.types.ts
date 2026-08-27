import type { VaultHit, VaultNote, VaultNoteSummary } from '@/entities/vault/model/note'

export type VaultWriteInput = { title: string; body: string; tags?: string[]; folder?: string }

export type VaultTools = {
  search(query: string, limit: number): Promise<VaultHit[]>
  read(id: string): Promise<VaultNote | null>
  write(input: VaultWriteInput): Promise<VaultNote | null>
  recent(limit: number): Promise<VaultNoteSummary[]>
}

export type VaultMcp = { url: string; token: string; close(): Promise<void> }

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

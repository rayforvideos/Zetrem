import type { SessionIdentity, StatusEvent } from './status.types'

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function errorStatus(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function fromStatusLine(
  event: Record<string, unknown>,
  parent: string | null = null,
): StatusEvent[] {
  switch (event.type) {
    case 'rate_limit_event':
      return fromRateLimit(event)
    case 'system':
      return parent === null ? fromSystem(event) : []
    case 'assistant':
      return parent === null ? fromAssistantUsage(event) : []
    case 'result':
      return parent === null ? fromResultMetrics(event) : []
    default:
      return []
  }
}

function fromSystem(event: Record<string, unknown>): StatusEvent[] {
  if (event.subtype === 'init') return [{ type: 'session', session: identity(event) }]
  if (event.subtype === 'status') {
    const activity = event.status === 'requesting' ? 'requesting' : 'idle'
    return [{ type: 'activity', activity }]
  }
  if (event.subtype === 'compact_boundary') return [compacted(event)]
  return []
}

function compacted(event: Record<string, unknown>): StatusEvent {
  const metadata = event.compact_metadata
  if (typeof metadata !== 'object' || metadata === null) {
    return { type: 'compacted', trigger: null, preTokens: null, postTokens: null }
  }
  const m = metadata as Record<string, unknown>
  return {
    type: 'compacted',
    trigger: typeof m.trigger === 'string' ? m.trigger : null,
    preTokens: typeof m.pre_tokens === 'number' ? m.pre_tokens : null,
    postTokens: typeof m.post_tokens === 'number' ? m.post_tokens : null,
  }
}

function identity(event: Record<string, unknown>): SessionIdentity {
  return {
    id: str(event.session_id),
    cwd: str(event.cwd),
    model: str(event.model, 'unknown'),
    permissionMode: str(event.permissionMode),
    cliVersion: str(event.claude_code_version),
    mcp: Array.isArray(event.mcp_servers)
      ? (event.mcp_servers as Record<string, unknown>[]).map((server) => ({
          name: str(server.name, '?'),
          status: str(server.status, 'unknown'),
        }))
      : [],
    tools: Array.isArray(event.tools)
      ? (event.tools as unknown[]).filter((name): name is string => typeof name === 'string')
      : [],
    agents: Array.isArray(event.agents)
      ? (event.agents as unknown[]).filter((name): name is string => typeof name === 'string')
      : [],
  }
}

function fromAssistantUsage(event: Record<string, unknown>): StatusEvent[] {
  if (typeof event.parent_tool_use_id === 'string') return []
  const usage = (event.message as Record<string, unknown> | undefined)?.usage
  if (typeof usage !== 'object' || usage === null) return []
  const u = usage as Record<string, unknown>
  const used = num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens)
  return used > 0 ? [{ type: 'context', used }] : []
}

// Picks the model entry that carried the conversation, not just the first key in
// modelUsage — object order does not reflect which model did the most work (e.g. a
// Haiku subagent call can sit before the main model that should drive the context %).
function carryingModel(
  models: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  if (!models) return undefined
  const entries = Object.values(models)
  if (entries.length === 0) return undefined

  const tokensOf = (m: Record<string, unknown>) =>
    num(m.inputTokens) + num(m.outputTokens) + num(m.cacheReadInputTokens) + num(m.cacheCreationInputTokens)

  return entries.reduce((heaviest, entry) => {
    if (tokensOf(entry) > tokensOf(heaviest)) return entry
    if (tokensOf(entry) === tokensOf(heaviest) && num(entry.contextWindow) > num(heaviest.contextWindow)) {
      return entry
    }
    return heaviest
  })
}

function fromResultMetrics(event: Record<string, unknown>): StatusEvent[] {
  const usage = (event.usage as Record<string, unknown> | undefined) ?? {}
  const models = event.modelUsage as Record<string, Record<string, unknown>> | undefined
  const carrier = carryingModel(models)
  const window = carrier ? num(carrier.contextWindow, 0) : 0
  return [
    {
      type: 'metrics',
      metrics: {
        costUsd: num(event.total_cost_usd),
        tokens: {
          in: num(usage.input_tokens),
          out: num(usage.output_tokens),
          cacheRead: num(usage.cache_read_input_tokens),
          cacheCreate: num(usage.cache_creation_input_tokens),
        },
        durationMs: num(event.duration_ms),
        turns: num(event.num_turns),
        contextWindow: window > 0 ? window : null,
        apiErrorStatus: errorStatus(event.api_error_status),
        stopReason: typeof event.stop_reason === 'string' ? event.stop_reason : null,
      },
    },
  ]
}

function fromRateLimit(event: Record<string, unknown>): StatusEvent[] {
  const info = event.rate_limit_info
  if (typeof info !== 'object' || info === null) return []
  const i = info as Record<string, unknown>
  return [
    {
      type: 'limit',
      limit: {
        kind: str(i.rateLimitType, 'unknown'),
        utilization: typeof i.utilization === 'number' ? i.utilization : null,
        resetsAtMs: num(i.resetsAt) * 1000,
        overage: i.isUsingOverage === true,
        status: str(i.status),
      },
    },
  ]
}

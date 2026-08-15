import type { SessionIdentity, StatusEvent } from './status.types'

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
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
  if (event.subtype === 'hook_started') {
    return [
      {
        type: 'hookStarted',
        hookId: str(event.hook_id),
        name: str(event.hook_name, 'hook'),
        event: str(event.hook_event),
      },
    ]
  }
  if (event.subtype === 'hook_response') {
    return [
      {
        type: 'hookDone',
        hookId: str(event.hook_id),
        exitCode: num(event.exit_code),
        stderr: str(event.stderr),
      },
    ]
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
  const memory = event.memory_paths
  return {
    id: str(event.session_id),
    cwd: str(event.cwd),
    model: str(event.model, 'unknown'),
    permissionMode: str(event.permissionMode),
    outputStyle: str(event.output_style),
    cliVersion: str(event.claude_code_version),
    apiKeySource: str(event.apiKeySource),
    fastMode: {
      state: str(event.fast_mode_state, 'off'),
      reason:
        str(event.fast_mode_state, 'off') === 'off' && typeof event.fast_mode_disabled_reason === 'string'
          ? event.fast_mode_disabled_reason
          : null,
    },
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
    counts: {
      tools: count(event.tools),
      commands: count(event.slash_commands),
      agents: count(event.agents),
      skills: count(event.skills),
      plugins: count(event.plugins),
    },
    memoryPaths:
      typeof memory === 'object' && memory !== null
        ? Object.values(memory as Record<string, unknown>).filter(
            (path): path is string => typeof path === 'string',
          )
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

function fromResultMetrics(event: Record<string, unknown>): StatusEvent[] {
  const usage = (event.usage as Record<string, unknown> | undefined) ?? {}
  const models = event.modelUsage as Record<string, Record<string, unknown>> | undefined
  const first = models ? Object.values(models)[0] : undefined
  const window = first ? num(first.contextWindow, 0) : 0
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
        ttftMs: typeof event.ttft_ms === 'number' ? event.ttft_ms : null,
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
        utilization: num(i.utilization),
        resetsAtMs: num(i.resetsAt) * 1000,
        overage: i.isUsingOverage === true,
        status: str(i.status),
      },
    },
  ]
}

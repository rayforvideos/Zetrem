/**
 * stream-json 중 **계기의 층**을 번역한다 — 세션의 신원, 컨텍스트, 비용, 사용량 한도,
 * 훅, 진행 상태, 압축. 대화가 아니라 상태줄과 서랍이 먹는 재료다.
 *
 * 순수 함수 — 이어붙이기(훅의 시작·끝 짝짓기, 컨텍스트 누적)는 상태를 가진 스토어의 일이다.
 * 여기서 시간을 읽거나 이전 줄을 기억하면 CLI 없이 테스트할 수 없게 된다.
 */
export type McpServer = { name: string; status: string }

export type Counts = {
  tools: number
  commands: number
  agents: number
  skills: number
  plugins: number
}

export type SessionIdentity = {
  id: string
  cwd: string
  model: string
  permissionMode: string
  outputStyle: string
  cliVersion: string
  apiKeySource: string
  /** 빠른 모드는 꺼진 이유까지 말해야 사람이 손쓸 수 있다 */
  fastMode: { state: string; reason: string | null }
  mcp: McpServer[]
  counts: Counts
  memoryPaths: string[]
}

export type ResultMetrics = {
  /** 세션 누적이다 (실측: 0.125331 → 0.166547). 턴 차액은 스토어가 뺀다 */
  costUsd: number
  tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
  durationMs: number
  ttftMs: number | null
  turns: number
  /** 컨텍스트의 분모. result 에서만 온다 — 모르면 % 를 띄우지 않는다 */
  contextWindow: number | null
  apiErrorStatus: string | null
  stopReason: string | null
}

export type RateLimit = {
  kind: string
  utilization: number
  resetsAtMs: number
  overage: boolean
  status: string
}

export type StatusEvent =
  | { type: 'session'; session: SessionIdentity }
  | { type: 'context'; used: number }
  | { type: 'metrics'; metrics: ResultMetrics }
  | { type: 'limit'; limit: RateLimit }
  | { type: 'hookStarted'; hookId: string; name: string; event: string }
  | { type: 'hookDone'; hookId: string; exitCode: number; stderr: string }
  | { type: 'activity'; activity: 'requesting' | 'idle' }
  // trigger 는 CLI 소스가 "manual"|"auto" 로 선언하지만, 셋째 값이 늘어도 파서가
  // 거짓을 말하지 않도록 string 으로 넓혀 둔다 (컨트롤러 판단, stream-shapes 노트)
  | { type: 'compacted'; trigger: string | null; preTokens: number | null; postTokens: number | null }

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export function fromStatusLine(event: Record<string, unknown>): StatusEvent[] {
  if (event.type === 'system') return fromSystem(event)
  if (event.type === 'assistant') return fromAssistantUsage(event)
  if (event.type === 'result') return fromResultMetrics(event)
  if (event.type === 'rate_limit_event') return fromRateLimit(event)
  return []
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
        name: str(event.hook_name, '훅'),
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

/**
 * 압축 경계는 trigger·pre_tokens·post_tokens 세 필드만 읽는다 (실측: stream-shapes 노트
 * §compact_boundary). zod 스키마의 나머지 여덜 필드는 CLI 자체 주석이 @internal 이라
 * 이름이나 존재 여부가 예고 없이 바뀔 수 있다는 신호다 — 확인 안 된 필드는 읽지 않는다.
 */
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
    model: str(event.model, '알 수 없음'),
    permissionMode: str(event.permissionMode),
    outputStyle: str(event.output_style),
    cliVersion: str(event.claude_code_version),
    apiKeySource: str(event.apiKeySource),
    fastMode: {
      state: str(event.fast_mode_state, 'off'),
      // 켜져 있을 때 이유를 들고 있으면 화면이 거짓말을 한다
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

/**
 * 컨텍스트는 result 를 기다리지 않는다 — 매 assistant 의 usage 합이 곧 지금 크기다
 * (실측: 2 + 16671 + 11691 = 28364, 다음 턴의 cache_read 28362 와 일치).
 * 자식(parent_tool_use_id)의 usage 는 자기 컨텍스트라 부모의 계기를 흔들면 안 된다.
 */
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
        apiErrorStatus: typeof event.api_error_status === 'string' ? event.api_error_status : null,
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
        kind: str(i.rateLimitType, '알 수 없음'),
        utilization: num(i.utilization),
        // 실측: resetsAt 은 epoch 초다. ms 로 바꿔 화면이 Date 로 바로 쓴다
        resetsAtMs: num(i.resetsAt) * 1000,
        overage: i.isUsingOverage === true,
        status: str(i.status),
      },
    },
  ]
}

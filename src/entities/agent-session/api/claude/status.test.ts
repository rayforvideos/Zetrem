import { describe, expect, it } from 'vitest'
import { fromStatusLine } from './status'

function initLine(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'system',
    subtype: 'init',
    cwd: '/Users/sam/workspace/zetrem',
    session_id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
    model: 'claude-opus-5[1m]',
    permissionMode: 'acceptEdits',
    output_style: 'default',
    apiKeySource: 'none',
    claude_code_version: '2.1.231',
    fast_mode_state: 'off',
    fast_mode_disabled_reason: 'sdk_opt_in_required',
    tools: ['Bash', 'Read', 'Edit'],
    slash_commands: ['init', 'run'],
    agents: ['claude'],
    skills: ['dataviz'],
    plugins: [{ name: 'superpowers' }],
    mcp_servers: [
      { name: 'playwright', status: 'connected' },
      { name: 'claude.ai Notion', status: 'needs-auth' },
    ],
    memory_paths: { auto: '/Users/sam/.claude/projects/x/memory/' },
    ...overrides,
  }
}

describe('status 파서 — 계기의 층', () => {
  it('init 이 세션의 신원을 준다', () => {
    const [event] = fromStatusLine(initLine())
    expect(event).toEqual({
      type: 'session',
      session: {
        id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
        cwd: '/Users/sam/workspace/zetrem',
        model: 'claude-opus-5[1m]',
        permissionMode: 'acceptEdits',
        outputStyle: 'default',
        cliVersion: '2.1.231',
        apiKeySource: 'none',
        fastMode: { state: 'off', reason: 'sdk_opt_in_required' },
        mcp: [
          { name: 'playwright', status: 'connected' },
          { name: 'claude.ai Notion', status: 'needs-auth' },
        ],
        tools: ['Bash', 'Read', 'Edit'],
        agents: ['claude'],
        counts: { tools: 3, commands: 2, agents: 1, skills: 1, plugins: 1 },
        memoryPaths: ['/Users/sam/.claude/projects/x/memory/'],
      },
    })
  })

  it('fast mode 가 켜져 있으면 꺼진 이유는 없다', () => {
    const [event] = fromStatusLine(initLine({ fast_mode_state: 'on', fast_mode_disabled_reason: undefined }))
    expect(event).toMatchObject({ type: 'session', session: { fastMode: { state: 'on', reason: null } } })
  })

  it('assistant 의 usage 합이 지금 Context 크기다 — result 를 기다리지 않는다', () => {
    const events = fromStatusLine({
      type: 'assistant',
      message: {
        usage: {
          input_tokens: 2,
          cache_read_input_tokens: 16671,
          cache_creation_input_tokens: 11691,
          output_tokens: 1,
        },
      },
    })
    expect(events).toEqual([{ type: 'context', used: 28364 }])
  })

  it('자식의 usage 는 부모의 컨텍스트가 아니다', () => {
    const events = fromStatusLine({
      type: 'assistant',
      parent_tool_use_id: 'toolu_1',
      message: { usage: { input_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } },
    })
    expect(events).toEqual([])
  })

  it('result 가 계기판을 준다 — 비용은 세션 누적값 그대로 넘긴다', () => {
    const events = fromStatusLine({
      type: 'result',
      subtype: 'success',
      total_cost_usd: 0.166547,
      duration_ms: 10485,
      ttft_ms: 2352,
      num_turns: 3,
      stop_reason: 'end_turn',
      api_error_status: null,
      usage: {
        input_tokens: 6,
        output_tokens: 261,
        cache_read_input_tokens: 76424,
        cache_creation_input_tokens: 14862,
      },
      modelUsage: { 'claude-opus-5[1m]': { contextWindow: 1_000_000 } },
    })
    expect(events).toEqual([
      {
        type: 'metrics',
        metrics: {
          costUsd: 0.166547,
          tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
          durationMs: 10485,
          ttftMs: 2352,
          turns: 3,
          contextWindow: 1_000_000,
          apiErrorStatus: null,
          stopReason: 'end_turn',
        },
      },
    ])
  })

  it('contextWindow 를 모르는 result 는 null 로 남긴다 — 기본값을 지어내지 않는다', () => {
    const [event] = fromStatusLine({ type: 'result', subtype: 'success', total_cost_usd: 0.1, usage: {} })
    expect(event).toMatchObject({ type: 'metrics', metrics: { contextWindow: null, ttftMs: null } })
  })

  it('rate_limit_event 를 한도로 옮긴다 — resetsAt 은 초라서 ms 로 바꾼다', () => {
    const events = fromStatusLine({
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed_warning',
        resetsAt: 1787173200,
        rateLimitType: 'seven_day',
        utilization: 0.28,
        isUsingOverage: false,
      },
    })
    expect(events).toEqual([
      {
        type: 'limit',
        limit: {
          kind: 'seven_day',
          utilization: 0.28,
          resetsAtMs: 1787173200000,
          overage: false,
          status: 'allowed_warning',
        },
      },
    ])
  })

  it('훅은 시작과 끝이 따로 온다 — hook_id 로 이어붙이는 것은 스토어의 일이다', () => {
    expect(
      fromStatusLine({
        type: 'system',
        subtype: 'hook_started',
        hook_id: 'c3d7',
        hook_name: 'SessionStart:startup',
        hook_event: 'SessionStart',
      }),
    ).toEqual([{ type: 'hookStarted', hookId: 'c3d7', name: 'SessionStart:startup', event: 'SessionStart' }])

    expect(
      fromStatusLine({
        type: 'system',
        subtype: 'hook_response',
        hook_id: 'c3d7',
        hook_name: 'SessionStart:startup',
        exit_code: 0,
        stderr: '',
      }),
    ).toEqual([{ type: 'hookDone', hookId: 'c3d7', exitCode: 0, stderr: '' }])
  })

  it('system/status 는 지금 무엇을 하는 중인지 말한다', () => {
    expect(fromStatusLine({ type: 'system', subtype: 'status', status: 'requesting' })).toEqual([
      { type: 'activity', activity: 'requesting' },
    ])
  })

  it('압축 경계는 trigger·pre/post 토큰을 읽는다 — 나머지 8개 @internal 필드는 손대지 않는다', () => {
    const events = fromStatusLine({
      type: 'system',
      subtype: 'compact_boundary',
      compact_metadata: {
        trigger: 'auto',
        pre_tokens: 180000,
        post_tokens: 42000,
        cumulative_dropped_tokens: 999,
      },
    })
    expect(events).toEqual([
      { type: 'compacted', trigger: 'auto', preTokens: 180000, postTokens: 42000 },
    ])
  })

  it('compact_metadata 가 없으면 세 필드 모두 null 이다 — 기본값을 지어내지 않는다', () => {
    expect(fromStatusLine({ type: 'system', subtype: 'compact_boundary' })).toEqual([
      { type: 'compacted', trigger: null, preTokens: null, postTokens: null },
    ])
  })

  it('모르는 줄에는 아무 말도 하지 않는다', () => {
    expect(fromStatusLine({ type: 'system', subtype: '알수없음' })).toEqual([])
    expect(fromStatusLine({ type: 'stream_event', event: { type: 'message_start' } })).toEqual([])
  })
})

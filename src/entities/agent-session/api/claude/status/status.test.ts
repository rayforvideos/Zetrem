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
      { name: 'claude.ai Notion', status: 'needs-auth' }
    ],
    memory_paths: { auto: '/Users/sam/.claude/projects/x/memory/' },
    ...overrides
  }
}

describe('the status parser: the instrument layer', () => {
  it('takes the identity of the session from init', () => {
    const [event] = fromStatusLine(initLine())
    expect(event).toEqual({
      type: 'session',
      session: {
        id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
        cwd: '/Users/sam/workspace/zetrem',
        model: 'claude-opus-5[1m]',
        permissionMode: 'acceptEdits',
        cliVersion: '2.1.231',
        mcp: [
          { name: 'playwright', status: 'connected' },
          { name: 'claude.ai Notion', status: 'needs-auth' }
        ],
        tools: ['Bash', 'Read', 'Edit'],
        agents: ['claude']
      }
    })
  })

  it('carries no reason for fast mode being off while it is on', () => {
    const [event] = fromStatusLine(initLine({ fast_mode_state: 'on', fast_mode_disabled_reason: undefined }))
    expect(event).toMatchObject({ type: 'session', session: { } })
  })

  it('reads context size from assistant usage, without waiting for a result', () => {
    const events = fromStatusLine({
      type: 'assistant',
      message: {
        usage: {
          input_tokens: 2,
          cache_read_input_tokens: 16671,
          cache_creation_input_tokens: 11691,
          output_tokens: 1
        }
      }
    })
    expect(events).toEqual([{ type: 'context', used: 28364 }])
  })

  it('keeps child usage out of the parent context', () => {
    const events = fromStatusLine({
      type: 'assistant',
      parent_tool_use_id: 'toolu_1',
      message: { usage: { input_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } }
    })
    expect(events).toEqual([])
  })

  it('takes the numbers from a result and passes the session cost through as it came', () => {
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
        cache_creation_input_tokens: 14862
      },
      modelUsage: { 'claude-opus-5[1m]': { contextWindow: 1_000_000 } }
    })
    expect(events).toEqual([
      {
        type: 'metrics',
        metrics: {
          costUsd: 0.166547,
          tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
          durationMs: 10485,
          turns: 3,
          contextWindow: 1_000_000,
          apiErrorStatus: null,
          stopReason: 'end_turn'
        }
      }
    ])
  })

  it('picks the context window of the model that carried the chat, not the first key', () => {
    const events = fromStatusLine({
      type: 'result',
      subtype: 'success',
      total_cost_usd: 0.2,
      usage: {},
      modelUsage: {
        'claude-haiku-4-5': {
          inputTokens: 8,
          outputTokens: 40,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          contextWindow: 200_000
        },
        'claude-sonnet-5': {
          inputTokens: 8,
          outputTokens: 349,
          cacheReadInputTokens: 82511,
          cacheCreationInputTokens: 36479,
          contextWindow: 1_000_000
        }
      }
    })
    expect(events).toEqual([
      expect.objectContaining({ type: 'metrics', metrics: expect.objectContaining({ contextWindow: 1_000_000 }) })
    ])
  })

  it('keeps a single model unchanged', () => {
    const events = fromStatusLine({
      type: 'result',
      subtype: 'success',
      total_cost_usd: 0.1,
      usage: {},
      modelUsage: { 'claude-opus-5[1m]': { contextWindow: 1_000_000 } }
    })
    expect(events).toEqual([
      expect.objectContaining({ type: 'metrics', metrics: expect.objectContaining({ contextWindow: 1_000_000 }) })
    ])
  })

  it('leaves an unknown context window empty rather than inventing a default', () => {
    const [event] = fromStatusLine({ type: 'result', subtype: 'success', total_cost_usd: 0.1, usage: {} })
    expect(event).toMatchObject({ type: 'metrics', metrics: { contextWindow: null} })
  })

  it('turns a rate limit event into a limit, converting its seconds to milliseconds', () => {
    const events = fromStatusLine({
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed_warning',
        resetsAt: 1787173200,
        rateLimitType: 'seven_day',
        utilization: 0.28,
        isUsingOverage: false
      }
    })
    expect(events).toEqual([
      {
        type: 'limit',
        limit: {
          kind: 'seven_day',
          utilization: 0.28,
          resetsAtMs: 1787173200000,
          overage: false,
          status: 'allowed_warning'
        }
      }
    ])
  })

  it('passes over hook traffic, which no screen reads', () => {
    expect(
      fromStatusLine({
        type: 'system',
        subtype: 'hook_started',
        hook_id: 'c3d7',
        hook_name: 'SessionStart:startup',
        hook_event: 'SessionStart'
      }),
    ).toEqual([])

    expect(
      fromStatusLine({
        type: 'system',
        subtype: 'hook_response',
        hook_id: 'c3d7',
        hook_name: 'SessionStart:startup',
        exit_code: 0,
        stderr: ''
      }),
    ).toEqual([])
  })

  it('reads a status line as what is happening now', () => {
    expect(fromStatusLine({ type: 'system', subtype: 'status', status: 'requesting' })).toEqual([
      { type: 'activity', activity: 'requesting' }
    ])
  })

  it('reads the trigger and the token counts off a compaction, and touches nothing else', () => {
    const events = fromStatusLine({
      type: 'system',
      subtype: 'compact_boundary',
      compact_metadata: {
        trigger: 'auto',
        pre_tokens: 180000,
        post_tokens: 42000,
        cumulative_dropped_tokens: 999
      }
    })
    expect(events).toEqual([
      { type: 'compacted', trigger: 'auto', preTokens: 180000, postTokens: 42000 }
    ])
  })

  it('leaves all three empty without compaction metadata, inventing no defaults', () => {
    expect(fromStatusLine({ type: 'system', subtype: 'compact_boundary' })).toEqual([
      { type: 'compacted', trigger: null, preTokens: null, postTokens: null }
    ])
  })

  it('says nothing about a line it does not know', () => {
    expect(fromStatusLine({ type: 'system', subtype: '알수없음' })).toEqual([])
    expect(fromStatusLine({ type: 'stream_event', event: { type: 'message_start' } })).toEqual([])
  })
})

describe('a rate limit event as the CLI actually sends it', () => {
  it('reports no share when the event carries none, rather than reporting none used', () => {
    const [event] = fromStatusLine({
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed',
        resetsAt: 1786831800,
        rateLimitType: 'five_hour',
        overageStatus: 'rejected',
        isUsingOverage: false
      }
    })
    expect(event).toEqual({
      type: 'limit',
      limit: {
        kind: 'five_hour',
        utilization: null,
        resetsAtMs: 1786831800000,
        overage: false,
        status: 'allowed'
      }
    })
  })
})

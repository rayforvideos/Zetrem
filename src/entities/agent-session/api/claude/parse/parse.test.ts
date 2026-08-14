import { describe, expect, it } from 'vitest'
import { parseClaudeLine, permissionAlwaysResult, permissionResult } from './parse'

function line(value: unknown): string {
  return JSON.stringify(value)
}

describe('parseClaudeLine', () => {
  it('turns an assistant text block into the headline', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: { content: [{ type: 'text', text: '테스트를 고치는 중입니다' }] },
      }),
    )
    expect(events).toContainEqual({ type: 'headline', text: '테스트를 고치는 중입니다' })
  })

  it('turns an assistant tool_use block into a stream line', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Read', input: { file_path: 'src/a.ts' } },
            { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } },
          ],
        },
      }),
    )
    expect(events).toContainEqual({
      type: 'stream',
      line: 'Read src/a.ts',
      toolUseId: null,
      input: { file_path: 'src/a.ts' },
    })
    expect(events).toContainEqual({
      type: 'stream',
      line: 'Bash npm test',
      toolUseId: null,
      input: { command: 'npm test' },
    })
  })

  it('cuts a long tool target, because the stream is not for reading in full', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Bash', input: { command: 'x'.repeat(300) } }],
        },
      }),
    )
    const stream = events.find((e) => e.type === 'stream')
    expect(stream).toBeDefined()
    expect(stream!.type === 'stream' && stream!.line.length).toBeLessThanOrEqual(120)
  })

  it('turns a result event into the end of a turn, leaving the numbers to the status reader', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'success',
        usage: { input_tokens: 1200, output_tokens: 340 },
      }),
    )
    expect(events).toContainEqual({ type: 'turnEnded' })
    expect(events.some((event) => event.type === 'metrics')).toBe(true)
  })

  it('shows a refused permission, because swallowing it leaves no reason on screen', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'success',
        permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }],
      }),
    )
    expect(events).toContainEqual({
      type: 'stream',
      line: 'permission denied: Bash',
      toolUseId: null,
      input: null,
    })
    expect(events).toContainEqual({ type: 'turnEnded' })
  })

  it('still ends the turn for a result with no usage', () => {
    const events = parseClaudeLine(line({ type: 'result', subtype: 'success' }))
    expect(events).toContainEqual({ type: 'turnEnded' })
  })

  it('ignores a line that is not JSON, because the CLI can print noise', () => {
    expect(parseClaudeLine('not json at all')).toEqual([])
    expect(parseClaudeLine('')).toEqual([])
  })

  it('ignores an event type it does not know', () => {
    expect(parseClaudeLine(line({ type: 'system', subtype: 'init' }))).toEqual([
      expect.objectContaining({ type: 'session' }),
    ])
    expect(parseClaudeLine(line({ type: 'system', subtype: '알수없음' }))).toEqual([])
  })

  it('turns a control request asking permission into a permission event', () => {
    const events = parseClaudeLine(
      line({
        type: 'control_request',
        request_id: 'req-1',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Bash',
          input: { command: 'mkdir demo' },
          tool_use_id: 'toolu_1',
        },
      }),
    )
    expect(events).toEqual([
      {
        type: 'permission',
        requestId: 'req-1',
        toolName: 'Bash',
        line: 'Bash mkdir demo',
        input: { command: 'mkdir demo' },
      },
    ])
  })

  it('ignores a control request that is not asking about a tool, rather than answering blind', () => {
    const events = parseClaudeLine(
      line({ type: 'control_request', request_id: 'req-2', request: { subtype: 'interrupt' } }),
    )
    expect(events).toEqual([])
  })

  it('reports both when a message mixes text and a tool call', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: '파일을 읽겠습니다' },
            { type: 'tool_use', name: 'Grep', input: { pattern: 'TODO' } },
          ],
        },
      }),
    )
    expect(events).toHaveLength(2)
  })
})

describe('parseClaudeLine: partial message deltas, as the CLI really sends them', () => {
  it('reports a text delta as draft', () => {
    const events = parseClaudeLine(
      line({
        type: 'stream_event',
        event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '안녕' } },
      }),
    )
    expect(events).toEqual([{ type: 'delta', text: '안녕' }])
  })

  it('keeps a child delta out of the parent draft', () => {
    const events = parseClaudeLine(
      line({
        type: 'stream_event',
        parent_tool_use_id: 'toolu_1',
        event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '자식 말' } },
      }),
    )
    expect(events).toEqual([])
  })

  it('leaves a delta that is not text out of the draft', () => {
    const events = parseClaudeLine(
      line({
        type: 'stream_event',
        event: { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"a"' } },
      }),
    )
    expect(events).toEqual([])
  })
})

describe('permissionResult', () => {
  it('hands the input back on allow, because the CLI drops a reply without it', () => {
    expect(permissionResult(true, { command: 'mkdir demo' })).toEqual({
      behavior: 'allow',
      updatedInput: { command: 'mkdir demo' },
    })
  })

  it('carries a reason on deny, which is what the agent decides on next', () => {
    const result = permissionResult(false, { command: 'rm -rf /' })
    expect(result.behavior).toBe('deny')
    expect('message' in result && result.message.length).toBeGreaterThan(0)
  })
})

describe('parseClaudeLine: subagents, as forwarded by the CLI', () => {
  it('opens a child on an Agent tool call, and the description is the name', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Agent',
              id: 'toolu_sub1',
              input: { description: '산술 문제 해결', prompt: '2+2?', subagent_type: 'general-purpose' },
            },
          ],
        },
      }),
    )
    expect(events).toContainEqual({
      type: 'childOpen',
      toolUseId: 'toolu_sub1',
      label: '산술 문제 해결',
      subagentType: 'general-purpose',
      prompt: '2+2?',
      background: false,
    })
  })

  it('reads assistant text with a parent as the child speaking', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_sub1',
        message: { content: [{ type: 'text', text: '2+2 = 4입니다.' }] },
      }),
    )
    expect(events).toEqual([
      { type: 'childSay', toolUseId: 'toolu_sub1', role: 'assistant', text: '2+2 = 4입니다.' },
    ])
  })

  it('reads user text with a parent as what the child was told', () => {
    const events = parseClaudeLine(
      line({
        type: 'user',
        parent_tool_use_id: 'toolu_sub1',
        message: { content: [{ type: 'text', text: '2+2는 무엇인가?' }] },
      }),
    )
    expect(events).toEqual([
      { type: 'childSay', toolUseId: 'toolu_sub1', role: 'user', text: '2+2는 무엇인가?' },
    ])
  })

  it('treats a tool_result as a possible child close, leaving the runner to say whose', () => {
    const events = parseClaudeLine(
      line({
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'toolu_sub1', content: '...' }],
        },
      }),
    )
    expect(events).toEqual([
      { type: 'childClosed', toolUseId: 'toolu_sub1' },
      {
        type: 'toolResult',
        toolUseId: 'toolu_sub1',
        stdout: '...',
        stderr: '',
        isError: false,
        interrupted: false,
      },
    ])
  })

  it('never leaks a child word into the parent headline', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_sub1',
        message: { content: [{ type: 'text', text: '자식의 말' }] },
      }),
    )
    expect(events.some((e) => e.type === 'headline')).toBe(false)
  })
})

describe('permissionAlwaysResult: allow from now on', () => {
  it('sends back a session rule for that tool, without writing the settings file', () => {
    const result = permissionAlwaysResult('Bash', { command: 'mkdir demo' })
    expect(result.behavior).toBe('allow')
    expect(result.updatedInput).toEqual({ command: 'mkdir demo' })
    expect(result.updatedPermissions).toEqual([
      { type: 'addRules', rules: [{ toolName: 'Bash' }], behavior: 'allow', destination: 'session' },
    ])
  })
})

describe('parseClaudeLine: background subagents', () => {
  it('marks a child as background, which means its tool_result is not a close', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Agent',
              id: 'toolu_bg1',
              input: { description: '백그라운드 일', prompt: 'x', run_in_background: true },
            },
          ],
        },
      }),
    )
    expect(events).toContainEqual({
      type: 'childOpen',
      toolUseId: 'toolu_bg1',
      label: '백그라운드 일',
      subagentType: '',
      prompt: 'x',
      background: true,
    })
  })
})

describe('parseClaudeLine: task notifications', () => {
  it('reads a completion notice as the child reporting back', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_notification',
        task_id: 'a9ad',
        tool_use_id: 'toolu_bg1',
        status: 'completed',
        summary: '4',
      }),
    )
    expect(events).toEqual([
      { type: 'childNotified', toolUseId: 'toolu_bg1', summary: '4', done: true },
    ])
  })

  it('does not read a notice that is not a completion as the child reporting back', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_notification',
        tool_use_id: 'toolu_bg1',
        status: 'running',
        summary: 'still going',
      }),
    )
    expect(events).toEqual([
      { type: 'childNotified', toolUseId: 'toolu_bg1', summary: 'still going', done: false },
    ])
  })

  it('carries what a subagent is doing, with the tools and tokens it has spent', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_progress',
        tool_use_id: 'toolu_bg1',
        description: 'Running Sleep for 20 seconds',
        last_tool_name: 'Bash',
        usage: { total_tokens: 12_822, tool_uses: 1, duration_ms: 3407 },
      }),
    )
    expect(events).toEqual([
      {
        type: 'childProgress',
        toolUseId: 'toolu_bg1',
        doing: 'Running Sleep for 20 seconds',
        lastTool: 'Bash',
        tokens: 12_822,
      },
    ])
  })

  it('still ignores every other system event', () => {
    expect(parseClaudeLine(line({ type: 'system', subtype: 'task_started' }))).toEqual([])
  })
})

describe('parseClaudeLine: a child that failed', () => {
  it('closes with the failure text, so the reason stays on screen', () => {
    const events = parseClaudeLine(
      line({
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_sub1',
              is_error: true,
              content: 'Agent type not found',
            },
          ],
        },
      }),
    )
    expect(events).toEqual([
      { type: 'childClosed', toolUseId: 'toolu_sub1', error: 'Agent type not found' },
      {
        type: 'toolResult',
        toolUseId: 'toolu_sub1',
        stdout: 'Agent type not found',
        stderr: '',
        isError: true,
        interrupted: false,
      },
    ])
  })

  it('carries no error on an ordinary result', () => {
    const events = parseClaudeLine(
      line({
        type: 'user',
        message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
      }),
    )
    expect(events).toEqual([
      { type: 'childClosed', toolUseId: 't1' },
      { type: 'toolResult', toolUseId: 't1', stdout: 'ok', stderr: '', isError: false, interrupted: false },
    ])
  })
})

describe('parseClaudeLine: what a child is doing, tool by tool', () => {
  it('turns a child tool call into a line on that child, which is the point of watching', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_sub1',
        message: {
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'src/a.ts' } }],
        },
      }),
    )
    expect(events).toEqual([
      { type: 'childStream', toolUseId: 'toolu_sub1', line: 'Read src/a.ts' },
    ])
  })

  it('never leaks a child tool call into the parent stream', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_sub1',
        message: {
          content: [{ type: 'tool_use', name: 'Bash', input: { command: 'ls' } }],
        },
      }),
    )
    expect(events.some((e) => e.type === 'stream')).toBe(false)
  })
})

describe('parseClaudeLine: thinking, and what tools gave back', () => {
  it('reports thinking as its own event, since it is a different voice', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: '17 * 23 은 17 * 20 + 17 * 3' },
            { type: 'text', text: '391 입니다' },
          ],
        },
      }),
    )
    expect(events).toEqual([
      { type: 'thinking', text: '17 * 23 은 17 * 20 + 17 * 3' },
      { type: 'headline', text: '391 입니다' },
    ])
  })

  it('reports nothing for an empty thinking block', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'thinking', thinking: '', signature: 'sig' }],
        },
      }),
    )
    expect(events.some((e) => e.type === 'thinking')).toBe(false)
  })

  it('carries the tool id, which is what attaches a result to it', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'toolu_9', name: 'Bash', input: { command: 'ls -la' } }],
        },
      }),
    )
    expect(events).toEqual([
      { type: 'stream', line: 'Bash ls -la', toolUseId: 'toolu_9', input: { command: 'ls -la' } },
    ])
  })

  it('carries the tool input, which is what a richer view is drawn from', () => {
    const [event] = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'Edit', input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' } }],
        },
      }),
    )
    expect(event).toMatchObject({ type: 'stream', input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' } })
  })

  it('carries the output of a tool result as it came', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ tool_use_id: 'toolu_9', type: 'tool_result', content: 'total 40', is_error: false }],
        },
        tool_use_result: { stdout: 'total 40', stderr: '', interrupted: false },
      }),
    )
    expect(events).toContainEqual({
      type: 'toolResult',
      toolUseId: 'toolu_9',
      stdout: 'total 40',
      stderr: '',
      isError: false,
      interrupted: false,
    })
  })

  it('marks a failed tool as failed, because swallowing it makes the screen lie', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ tool_use_id: 'toolu_9', type: 'tool_result', content: 'no such file', is_error: true }],
        },
      }),
    )
    const event = events.find((e) => e.type === 'toolResult')
    expect(event).toMatchObject({ type: 'toolResult', isError: true, stdout: 'no such file' })
  })
})

describe('a nested line belongs to the child, never to the conversation', () => {
  it('does not end the turn when a subagent finishes its own run', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'result',
        parent_tool_use_id: 'toolu_a',
        subtype: 'success',
        usage: { output_tokens: 10 },
        duration_ms: 1000,
      }),
    )
    expect(events.some((event) => event.type === 'turnEnded')).toBe(false)
  })

  it('ends the turn when the conversation itself finishes', () => {
    const events = parseClaudeLine(
      JSON.stringify({ type: 'result', subtype: 'success', duration_ms: 1000 }),
    )
    expect(events.some((event) => event.type === 'turnEnded')).toBe(true)
  })

  it('does not bill a subagent run to the conversation', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'result',
        parent_tool_use_id: 'toolu_a',
        subtype: 'success',
        usage: { output_tokens: 999 },
        total_cost_usd: 9.99,
        duration_ms: 1000,
      }),
    )
    expect(events.some((event) => event.type === 'metrics')).toBe(false)
  })

  it('does not read the conversation context gauge off a subagent message', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        parent_tool_use_id: 'toolu_a',
        message: { content: [{ type: 'text', text: 'thinking out loud' }], usage: { input_tokens: 90_000 } },
      }),
    )
    expect(events.some((event) => event.type === 'context')).toBe(false)
    expect(events.some((event) => event.type === 'childSay')).toBe(true)
  })

  it('still reports a subagent finishing, since the notice is about the child', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'system',
        subtype: 'task_notification',
        tool_use_id: 'toolu_a',
        summary: 'read the file',
      }),
    )
    expect(events).toContainEqual({
      type: 'childNotified',
      toolUseId: 'toolu_a',
      summary: 'read the file',
      done: true,
    })
  })
})

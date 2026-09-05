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

  it('says a refused tool in words, not as a tool row named after the refusal', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'success',
        permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }],
      }),
    )
    expect(events).toContainEqual({ type: 'notice', text: 'Bash was not allowed' })
    expect(events.some((event) => event.type === 'stream')).toBe(false)
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
        detail: 'mkdir demo',
        input: { command: 'mkdir demo' },
      },
    ])
  })

  it('carries the plan a plan-mode request is asking about, so the card can show it', () => {
    const plan = '## Steps\n\n1. Read the config\n2. Add the flag'
    const events = parseClaudeLine(
      line({
        type: 'control_request',
        request_id: 'req-3',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'ExitPlanMode',
          input: { plan, planFilePath: '/tmp/plan.md' },
          tool_use_id: 'toolu_2',
        },
      }),
    )
    expect(events).toEqual([
      expect.objectContaining({ type: 'permission', toolName: 'ExitPlanMode', plan }),
    ])
    // The plan is prose, and the tile line stays the short thing it is.
    expect(events[0]).toMatchObject({ line: 'ExitPlanMode', detail: '' })
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
        event: {
          type: 'content_block_delta',
          delta: { type: 'input_json_delta', partial_json: '{"a"' },
        },
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
              input: {
                description: '산술 문제 해결',
                prompt: '2+2?',
                subagent_type: 'general-purpose',
              },
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
      {
        type: 'addRules',
        rules: [{ toolName: 'Bash', ruleContent: 'mkdir demo' }],
        behavior: 'allow',
        destination: 'session',
      },
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
      subagentType: 'general-purpose',
      prompt: 'x',
      background: true,
    })
  })

  it('shows a call that named no type as the general-purpose agent the CLI runs it as', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'toolu_nt', name: 'Agent', input: { prompt: 'x' } }],
        },
      }),
    )
    expect(events.find((one) => one.type === 'childOpen')).toMatchObject({
      subagentType: 'general-purpose',
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
      {
        type: 'childNotified',
        toolUseId: 'toolu_bg1',
        taskId: 'a9ad',
        summary: '4',
        done: true,
        failed: false,
      },
    ])
  })

  it('does not read a notice that is not a completion as the child reporting back', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_notification',
        task_id: 'a9ad',
        tool_use_id: 'toolu_bg1',
        status: 'running',
        summary: 'still going',
      }),
    )
    expect(events).toEqual([
      {
        type: 'childNotified',
        toolUseId: 'toolu_bg1',
        taskId: 'a9ad',
        summary: 'still going',
        done: false,
        failed: false,
      },
    ])
  })

  it('carries what a subagent is doing, with the tools and tokens it has spent', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_progress',
        task_id: 'a9ad',
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
        taskId: 'a9ad',
        doing: 'Running Sleep for 20 seconds',
        lastTool: 'Bash',
        tokens: 12_822,
      },
    ])
  })

  it('takes a notice that carries only a task id, since the tool id is optional', () => {
    const events = parseClaudeLine(
      line({ type: 'system', subtype: 'task_notification', task_id: 'a9ad', summary: 'done' }),
    )
    expect(events).toEqual([
      {
        type: 'childNotified',
        toolUseId: null,
        taskId: 'a9ad',
        summary: 'done',
        done: true,
        failed: false,
      },
    ])
  })

  it('drops a task event with no task id, because there is nothing to aim it at', () => {
    expect(parseClaudeLine(line({ type: 'system', subtype: 'task_started' }))).toEqual([])
    expect(parseClaudeLine(line({ type: 'system', subtype: 'task_progress' }))).toEqual([])
  })

  it('reads a task state change as what it is, rather than waiting out the silence', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_updated',
        task_id: 'a9ad',
        patch: { status: 'completed', end_time: 1000 },
      }),
    )
    expect(events).toEqual([
      { type: 'childStateKnown', toolUseId: null, taskId: 'a9ad', state: 'completed', error: '' },
    ])
  })

  it('carries the reason a task failed', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'task_updated',
        task_id: 'a9ad',
        patch: { status: 'failed', error: 'the tool crashed' },
      }),
    )
    expect(events).toEqual([
      {
        type: 'childStateKnown',
        toolUseId: null,
        taskId: 'a9ad',
        state: 'failed',
        error: 'the tool crashed',
      },
    ])
  })

  it('ignores a patch that says nothing about the state', () => {
    const line1 = line({ type: 'system', subtype: 'task_updated', task_id: 'a', patch: {} })
    expect(parseClaudeLine(line1)).toEqual([])
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
      {
        type: 'toolResult',
        toolUseId: 't1',
        stdout: 'ok',
        stderr: '',
        isError: false,
        interrupted: false,
      },
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
      {
        type: 'childStream',
        toolUseId: 'toolu_sub1',
        callId: 'Read src/a.ts',
        line: 'Read src/a.ts',
        input: { file_path: 'src/a.ts' },
      },
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

  it('carries an Edit call’s input intact, so a diff view can read it later', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_sub1',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Edit',
              input: { file_path: 'src/a.ts', old_string: 'a', new_string: 'b' },
            },
          ],
        },
      }),
    )
    const stream = events.find((e) => e.type === 'childStream')
    expect(stream).toMatchObject({
      type: 'childStream',
      input: { file_path: 'src/a.ts', old_string: 'a', new_string: 'b' },
    })
  })

  it('opens a nested session, with its parent, when a child calls Agent', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_sub1',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'toolu_grand1',
              name: 'Agent',
              input: {
                subagent_type: 'Explore',
                description: '탐색',
                prompt: '찾아봐',
              },
            },
          ],
        },
      }),
    )
    expect(events).toEqual([
      {
        type: 'childOpen',
        toolUseId: 'toolu_grand1',
        label: '탐색',
        subagentType: 'Explore',
        prompt: '찾아봐',
        background: false,
        parentId: 'toolu_sub1',
      },
      {
        type: 'childStream',
        toolUseId: 'toolu_sub1',
        callId: 'toolu_grand1',
        line: expect.any(String),
        input: expect.any(Object),
      },
    ])
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
          content: [
            { type: 'tool_use', id: 'toolu_9', name: 'Bash', input: { command: 'ls -la' } },
          ],
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
          content: [
            {
              type: 'tool_use',
              id: 't1',
              name: 'Edit',
              input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' },
            },
          ],
        },
      }),
    )
    expect(event).toMatchObject({
      type: 'stream',
      input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' },
    })
  })

  it('carries the output of a tool result as it came', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [
            { tool_use_id: 'toolu_9', type: 'tool_result', content: 'total 40', is_error: false },
          ],
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

  it('carries the agent id a finished Agent call reports, which names its branch', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ tool_use_id: 'toolu_a', type: 'tool_result', content: 'done' }],
        },
        tool_use_result: { agentId: 'a879059595fc11096', outputFile: '/tmp/out.md' },
      }),
    )
    expect(events.find((one) => one.type === 'toolResult')).toMatchObject({
      toolUseId: 'toolu_a',
      agentId: 'a879059595fc11096',
    })
  })

  it('marks a failed tool as failed, because swallowing it makes the screen lie', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [
            {
              tool_use_id: 'toolu_9',
              type: 'tool_result',
              content: 'no such file',
              is_error: true,
            },
          ],
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
        message: {
          content: [{ type: 'text', text: 'thinking out loud' }],
          usage: { input_tokens: 90_000 },
        },
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
        task_id: 'task_a',
        tool_use_id: 'toolu_a',
        summary: 'read the file',
      }),
    )
    expect(events).toContainEqual({
      type: 'childNotified',
      toolUseId: 'toolu_a',
      taskId: 'task_a',
      summary: 'read the file',
      done: true,
      failed: false,
    })
  })
})

describe('a turn that stops short says so, rather than just stopping', () => {
  it('reports a run that ran out of turns, in the words the CLI used', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'error_max_turns',
        is_error: true,
        terminal_reason: 'max_turns',
        errors: ['Reached maximum number of turns (1)'],
        duration_ms: 3882,
      }),
    )
    expect(events).toContainEqual({
      type: 'notice',
      text: 'Stopped: Reached maximum number of turns (1)',
    })
    expect(events.some((event) => event.type === 'turnEnded')).toBe(true)
  })

  it('reports a run that ran out of money', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'error_max_budget_usd',
        is_error: true,
        errors: ['Reached maximum budget ($0.02)'],
      }),
    )
    expect(events).toContainEqual({
      type: 'notice',
      text: 'Stopped: Reached maximum budget ($0.02)',
    })
  })

  it('says nothing extra when the turn ended well', () => {
    const events = parseClaudeLine(line({ type: 'result', subtype: 'success', duration_ms: 10 }))
    expect(events.some((event) => event.type === 'notice')).toBe(false)
  })

  it('leaves a subagent failure to the subagent, not to the conversation', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'error_max_turns',
        parent_tool_use_id: 'toolu_a',
        errors: ['Reached maximum number of turns (1)'],
      }),
    )
    expect(events).toEqual([])
  })
})

describe('the app says when the CLI is retrying rather than looking frozen', () => {
  it('reads the retry the CLI announced', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'api_retry',
        attempt: 2,
        max_retries: 5,
        retry_delay_ms: 4000,
        error_status: 529,
        error: 'overloaded',
      }),
    )
    expect(events).toEqual([
      { type: 'notice', text: 'The model is overloaded (529). Trying again in 4s, attempt 2 of 5' },
    ])
  })

  it('says which model took over when the one you picked declined', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'model_refusal_fallback',
        original_model: 'claude-opus-5',
        fallback_model: 'claude-sonnet-5',
        content: 'Retrying on a different model.',
      }),
    )
    expect(events).toEqual([
      {
        type: 'notice',
        text: 'Opus declined this, so Sonnet took it. Retrying on a different model.',
      },
    ])
  })

  it('says so when the model declined and there was nothing to fall back to', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'model_refusal_no_fallback',
        original_model: 'claude-opus-5',
        content: '',
      }),
    )
    expect(events).toEqual([
      { type: 'notice', text: 'Opus declined this and there is nothing to fall back to' },
    ])
  })

  it('never leaves a refusal silent, even with no words and no model named', () => {
    const events = parseClaudeLine(line({ type: 'system', subtype: 'model_refusal_fallback' }))
    expect(events).toEqual([{ type: 'notice', text: 'The model declined this' }])
  })

  it('says when a tool was blocked, rather than letting it look like nothing happened', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'permission_denied',
        tool_name: 'Bash',
        message: 'the project settings do not allow it',
      }),
    )
    expect(events).toEqual([
      { type: 'notice', text: 'Bash was not allowed: the project settings do not allow it' },
    ])
  })

  it('passes on what the CLI wants you told, whichever field it used', () => {
    expect(
      parseClaudeLine(line({ type: 'system', subtype: 'notification', text: 'Fast mode is off' })),
    ).toEqual([{ type: 'notice', text: 'Fast mode is off' }])
    expect(
      parseClaudeLine(
        line({ type: 'system', subtype: 'informational', content: 'Memory was recalled' }),
      ),
    ).toEqual([{ type: 'notice', text: 'Memory was recalled' }])
  })

  it('holds back a notice with no words in it', () => {
    expect(parseClaudeLine(line({ type: 'system', subtype: 'notification' }))).toEqual([])
    expect(parseClaudeLine(line({ type: 'system', subtype: 'informational' }))).toEqual([])
  })

  it('says the session is closing, so a window going quiet has a reason', () => {
    const events = parseClaudeLine(
      line({ type: 'system', subtype: 'worker_shutting_down', reason: 'idle timeout' }),
    )
    expect(events).toEqual([{ type: 'notice', text: 'The session is closing: idle timeout' }])
  })

  it('keeps every one of these out of the parent when it belongs to a child', () => {
    for (const subtype of [
      'model_refusal_fallback',
      'model_refusal_no_fallback',
      'permission_denied',
      'notification',
      'informational',
      'worker_shutting_down',
    ]) {
      const events = parseClaudeLine(
        line({ type: 'system', subtype, parent_tool_use_id: 'toolu_a', content: 'x', reason: 'x' }),
      )
      expect(events, subtype).toEqual([])
    }
  })
})

describe('a permission request the CLI takes back', () => {
  it('is read as a request to drop, naming which one', () => {
    const events = parseClaudeLine(line({ type: 'control_cancel_request', request_id: 'req_7' }))
    expect(events).toEqual([{ type: 'permissionDropped', requestId: 'req_7' }])
  })

  it('is ignored when it names nothing', () => {
    expect(parseClaudeLine(line({ type: 'control_cancel_request' }))).toEqual([])
  })
})

describe('a server or plugin that never loaded says so, instead of just being absent', () => {
  it('names an MCP server the CLI skipped and why', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'init',
        session_id: 's',
        cwd: '/w',
        model: 'm',
        tools: [],
        agents: [],
        mcp_servers: [],
        mcp_server_errors: [
          { name: 'notion', type: 'url_missing_type', message: 'url entry has no type' },
        ],
      }),
    )
    expect(events).toContainEqual({
      type: 'notice',
      text: 'MCP server notion did not load: url entry has no type',
    })
  })

  it('names a plugin that failed to load', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'init',
        session_id: 's',
        cwd: '/w',
        model: 'm',
        tools: [],
        agents: [],
        mcp_servers: [],
        plugin_errors: [{ plugin: 'nx', type: 'missing_path', message: 'no such directory' }],
      }),
    )
    expect(events).toContainEqual({
      type: 'notice',
      text: 'Plugin nx did not load: no such directory',
    })
  })

  it('says nothing when everything loaded, which is the usual case', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'init',
        session_id: 's',
        cwd: '/w',
        model: 'm',
        tools: [],
        agents: [],
        mcp_servers: [],
      }),
    )
    expect(events.some((event) => event.type === 'notice')).toBe(false)
  })

  it('falls back to the skip category when no message came with it', () => {
    const events = parseClaudeLine(
      line({
        type: 'system',
        subtype: 'init',
        session_id: 's',
        cwd: '/w',
        model: 'm',
        tools: [],
        agents: [],
        mcp_server_errors: [{ name: 'ghost', type: 'reserved_name' }],
      }),
    )
    expect(events).toContainEqual({
      type: 'notice',
      text: 'MCP server ghost did not load: reserved_name',
    })
  })
})

describe('the tool that summons a teammate, whatever the CLI calls it', () => {
  function summon(name: string): string {
    return JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_s1',
            name,
            input: { subagent_type: 'Explore', description: 'Go look', prompt: 'look' },
          },
        ],
      },
    })
  }

  it('opens a teammate for the name the CLI sends today', () => {
    expect(parseClaudeLine(summon('Agent')).some((e) => e.type === 'childOpen')).toBe(true)
  })

  it('still opens one for the name the CLI used to send, so an old session is not blank', () => {
    expect(parseClaudeLine(summon('Task')).some((e) => e.type === 'childOpen')).toBe(true)
  })

  it('opens nothing for a tool that merely sounds like it summons someone', () => {
    expect(parseClaudeLine(summon('AgentOutput')).some((e) => e.type === 'childOpen')).toBe(false)
  })
})

describe('a content array with a hole in it', () => {
  it('reads the blocks around a null instead of throwing the line away', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: { content: [null, { type: 'text', text: 'still here' }] },
      }),
    )
    expect(events).toContainEqual({ type: 'headline', text: 'still here' })
  })

  it('does the same for what a teammate says', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        parent_tool_use_id: 'toolu_p1',
        message: { content: [null, { type: 'text', text: 'still here' }] },
      }),
    )
    expect(events).toContainEqual({
      type: 'childSay',
      toolUseId: 'toolu_p1',
      role: 'assistant',
      text: 'still here',
    })
  })

  it('does the same for a tool result', () => {
    const events = parseClaudeLine(
      line({
        type: 'user',
        message: {
          content: [null, { type: 'tool_result', tool_use_id: 'toolu_r1', content: 'done' }],
        },
      }),
    )
    expect(events.some((event) => event.type === 'toolResult')).toBe(true)
  })
})

describe('parseClaudeLine: a task that ended badly', () => {
  it('marks a failed or killed notice as failed, and never as done', () => {
    for (const status of ['failed', 'killed']) {
      const events = parseClaudeLine(
        JSON.stringify({
          type: 'system',
          subtype: 'task_notification',
          task_id: 'a9ad',
          tool_use_id: 'toolu_bad',
          status,
          summary: 'Agent stalled: no progress for 600s',
        }),
      )
      expect(events).toContainEqual({
        type: 'childNotified',
        toolUseId: 'toolu_bad',
        taskId: 'a9ad',
        summary: 'Agent stalled: no progress for 600s',
        done: false,
        failed: true,
      })
    }
  })
})

import { describe, expect, it } from 'vitest'
import { parseClaudeLine, permissionAlwaysResult, permissionResult } from './parse'

function line(value: unknown): string {
  return JSON.stringify(value)
}

describe('parseClaudeLine', () => {
  it('assistant 의 text 블록은 1층 headline 이 된다', () => {
    const events = parseClaudeLine(
      line({
        type: 'assistant',
        message: { content: [{ type: 'text', text: '테스트를 고치는 중입니다' }] },
      }),
    )
    expect(events).toContainEqual({ type: 'headline', text: '테스트를 고치는 중입니다' })
  })

  it('assistant 의 tool_use 블록은 2층 stream 라인이 된다', () => {
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

  it('tool_use 의 대상이 길면 자른다 — 2층은 읽는 층이 아니다', () => {
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

  it('result 이벤트는 턴 종료를 낸다 — 계기는 status.ts 가 따로 읽는다', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'success',
        usage: { input_tokens: 1200, output_tokens: 340 },
      }),
    )
    expect(events).toContainEqual({ type: 'turnEnded' })
    // 같은 줄에서 컨텍스트·비용은 status.ts 의 metrics 가 든다 (turn.ts 의 meter 는 폐기)
    expect(events.some((event) => event.type === 'metrics')).toBe(true)
  })

  it('권한 거부는 2층에 드러난다 — 조용히 삼키면 이유가 화면에 없다', () => {
    const events = parseClaudeLine(
      line({
        type: 'result',
        subtype: 'success',
        permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }],
      }),
    )
    expect(events).toContainEqual({
      type: 'stream',
      line: '권한 거부됨 Bash',
      toolUseId: null,
      input: null,
    })
    expect(events).toContainEqual({ type: 'turnEnded' })
  })

  it('usage 가 없는 result 도 턴 종료는 낸다', () => {
    const events = parseClaudeLine(line({ type: 'result', subtype: 'success' }))
    expect(events).toContainEqual({ type: 'turnEnded' })
  })

  it('JSON 이 아닌 줄은 조용히 무시한다 — CLI 는 잡음을 낼 수 있다', () => {
    expect(parseClaudeLine('not json at all')).toEqual([])
    expect(parseClaudeLine('')).toEqual([])
  })

  it('모르는 이벤트 타입은 무시한다', () => {
    // system/init 은 더 이상 낯선 타입이 아니다 — Task 3 이 계기의 층에서 세션 신원으로 읽는다.
    // 여기서는 여전히 대화 이벤트가 비어 있다는 것만 확인한다 (session 신원 값 검증은 status.test.ts)
    expect(parseClaudeLine(line({ type: 'system', subtype: 'init' }))).toEqual([
      expect.objectContaining({ type: 'session' }),
    ])
    expect(parseClaudeLine(line({ type: 'system', subtype: '알수없음' }))).toEqual([])
  })

  it('control_request 의 권한 질문은 permission 이벤트가 된다 (CLI 2.1.229 실측)', () => {
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

  it('can_use_tool 이 아닌 control_request 는 무시한다 — 모르는 제어 요청에 답하면 안 된다', () => {
    const events = parseClaudeLine(
      line({ type: 'control_request', request_id: 'req-2', request: { subtype: 'interrupt' } }),
    )
    expect(events).toEqual([])
  })

  it('text 와 tool_use 가 섞인 메시지는 둘 다 낸다', () => {
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

describe('parseClaudeLine — 부분 메시지 델타 (2026-08-14 실측: --include-partial-messages)', () => {
  it('부분 메시지의 텍스트 델타를 초안으로 낸다', () => {
    const events = parseClaudeLine(
      line({
        type: 'stream_event',
        event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '안녕' } },
      }),
    )
    expect(events).toEqual([{ type: 'delta', text: '안녕' }])
  })

  it('자식의 델타는 부모의 초안이 아니다', () => {
    const events = parseClaudeLine(
      line({
        type: 'stream_event',
        parent_tool_use_id: 'toolu_1',
        event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '자식 말' } },
      }),
    )
    expect(events).toEqual([])
  })

  it('텍스트가 아닌 델타는 초안에 넣지 않는다', () => {
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
  it('허용은 입력을 그대로 되돌린다 — updatedInput 이 없으면 CLI 가 응답을 버린다', () => {
    expect(permissionResult(true, { command: 'mkdir demo' })).toEqual({
      behavior: 'allow',
      updatedInput: { command: 'mkdir demo' },
    })
  })

  it('거부는 이유 문구를 담는다 — 에이전트가 다음 행동을 정할 근거다', () => {
    const result = permissionResult(false, { command: 'rm -rf /' })
    expect(result.behavior).toBe('deny')
    expect('message' in result && result.message.length).toBeGreaterThan(0)
  })
})

describe('parseClaudeLine — 서브에이전트 (--forward-subagent-text, 2.1.229 실측)', () => {
  it('Agent tool_use 는 자식 열림이 된다 — 설명이 이름이다', () => {
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
      // 자식이 첫 마디를 하기 전까지 타일이 텅 비지 않게 — 받은 일감이 첫 화면이다
      prompt: '2+2?',
      background: false,
    })
  })

  it('parent 가 붙은 assistant text 는 자식의 말이다', () => {
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

  it('parent 가 붙은 user text 는 자식이 받은 프롬프트다', () => {
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

  it('tool_result 는 자식 닫힘 후보다 — 어느 도구의 것인지는 러너가 가른다', () => {
    const events = parseClaudeLine(
      line({
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'toolu_sub1', content: '...' }],
        },
      }),
    )
    // 파서는 자식 닫힘 후보와 도구 결과를 둘 다 낸다 — 어느 쪽을 쓸지는 러너(childIds)가 가른다
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

  it('parent 가 붙은 말은 부모의 1층으로 새지 않는다', () => {
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

describe('permissionAlwaysResult — 항상 허용', () => {
  it('도구 단위 세션 규칙을 함께 되돌려준다 — 사용자 설정 파일을 쓰지 않는다', () => {
    const result = permissionAlwaysResult('Bash', { command: 'mkdir demo' })
    expect(result.behavior).toBe('allow')
    expect(result.updatedInput).toEqual({ command: 'mkdir demo' })
    // ruleContent 가 없어야 한다 — 명령 prefix 규칙은 질문 폭풍을 끄지 못한다 (2026-08-13 실측)
    expect(result.updatedPermissions).toEqual([
      { type: 'addRules', rules: [{ toolName: 'Bash' }], behavior: 'allow', destination: 'session' },
    ])
  })
})

describe('parseClaudeLine — 백그라운드 서브에이전트 (2026-08-13 실측)', () => {
  it('run_in_background 가 참이면 childOpen 에 실린다 — tool_result 가 닫힘이 아니게 된다', () => {
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
      prompt: 'x',
      background: true,
    })
  })
})

describe('parseClaudeLine — task_notification (2026-08-13 실측)', () => {
  it('백그라운드 자식의 완료 알림은 childNotified 가 된다', () => {
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
    expect(events).toEqual([{ type: 'childNotified', toolUseId: 'toolu_bg1', summary: '4' }])
  })

  it('다른 system 이벤트는 여전히 무시한다', () => {
    expect(parseClaudeLine(line({ type: 'system', subtype: 'task_started' }))).toEqual([])
  })
})

describe('parseClaudeLine — 자식의 실패 (2026-08-13 화면 녹화로 발견)', () => {
  it('is_error 인 tool_result 는 실패 내용을 담아 닫힌다 — 왜 죽었는지 화면에 남아야 한다', () => {
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

  it('정상 tool_result 에는 error 가 없다', () => {
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

describe('parseClaudeLine — 자식의 도구 활동 (2026-08-13 실측: tool_use 도 전달된다)', () => {
  it('parent 가 붙은 tool_use 는 자식의 2층 줄이 된다 — 무슨 일을 하는지가 핵심이다', () => {
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

  it('자식의 tool_use 는 부모의 2층으로 새지 않는다', () => {
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

describe('parseClaudeLine — 생각과 도구 결과 (Task 10)', () => {
  it('생각 블록을 자기 이벤트로 낸다 — 본문과 다른 목소리다', () => {
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

  it('빈 thinking 블록은 아무 이벤트도 내지 않는다 — 없는 생각을 있다고 말하지 않는다', () => {
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

  it('도구 활동이 자기 id 를 들고 온다 — 결과를 그 눈금에 붙이려면 필요하다', () => {
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

  it('도구 입력을 함께 실어 온다 — 전용 렌더의 재료다', () => {
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

  it('도구 결과의 출력을 그대로 들고 온다', () => {
    const events = parseClaudeLine(
      JSON.stringify({
        type: 'user',
        message: {
          content: [{ tool_use_id: 'toolu_9', type: 'tool_result', content: 'total 40', is_error: false }],
        },
        tool_use_result: { stdout: 'total 40', stderr: '', interrupted: false },
      }),
    )
    // 부모 대화에서 온 tool_result 도 자식 닫힘 후보를 함께 낸다 (러너가 childIds 로 가른다) —
    // 그래서 toEqual 이 아니라 도구 결과 이벤트만 짚어 본다
    expect(events).toContainEqual({
      type: 'toolResult',
      toolUseId: 'toolu_9',
      stdout: 'total 40',
      stderr: '',
      isError: false,
      interrupted: false,
    })
  })

  it('실패한 도구는 실패로 표시된다 — 조용히 삼키면 화면이 거짓말한다', () => {
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

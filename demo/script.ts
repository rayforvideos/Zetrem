// A recorded run, written out as the lines the CLI itself would have printed.
// The page feeds these through the app's own parser, so nothing here is a
// mock of the screen: it is the same road a live session takes.
export type DemoBeat = {
  // Milliseconds to wait after the previous beat before this one is sent.
  afterMs: number
  event: Record<string, unknown>
  // A side effect the tape carries: the library suggestion lands mid-run, the
  // way a session raises one while it works rather than before it starts.
  raises?: 'proposal'
  // A permission ask stops the tape: the run only goes on once the person has
  // answered, the way a real session waits on them.
  holdForAnswer?: boolean
  // The tour stops the tape here and the visitor starts it again by moving on,
  // so what happens next happens because they asked for it rather than because
  // a timer went off while they were reading.
  holds?: boolean
}

const ELECTRON = 'tu_electron'
const REACT = 'tu_react'
const REVIEWER = 'tu_reviewer'

function agentCall(id: string, type: string, description: string, prompt: string) {
  return {
    type: 'tool_use',
    id,
    name: 'Agent',
    input: { subagent_type: type, description, prompt },
  }
}

function assistant(content: unknown[], parent?: string) {
  return {
    type: 'assistant',
    ...(parent === undefined ? {} : { parent_tool_use_id: parent }),
    message: { role: 'assistant', content },
  }
}

function toolResult(parent: string, id: string, text: string) {
  return {
    type: 'user',
    parent_tool_use_id: parent,
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: text }] },
  }
}

function started(taskId: string, toolUseId: string, type: string, description: string) {
  return {
    type: 'system',
    subtype: 'task_started',
    task_id: taskId,
    tool_use_id: toolUseId,
    task_type: 'agent',
    subagent_type: type,
    description,
  }
}

function progress(taskId: string, toolUseId: string, doing: string, tool: string, tokens: number) {
  return {
    type: 'system',
    subtype: 'task_progress',
    task_id: taskId,
    tool_use_id: toolUseId,
    description: doing,
    last_tool_name: tool,
    usage: { total_tokens: tokens },
  }
}

function notified(taskId: string, toolUseId: string, summary: string) {
  return {
    type: 'system',
    subtype: 'task_notification',
    task_id: taskId,
    tool_use_id: toolUseId,
    status: 'completed',
    summary,
  }
}

// The line that actually closes a teammate's tile. A notification only parks
// it: the CLI reports the end itself, and without this the tiles stand until
// the whole run is over and then leave in the middle of the next stop.
function finished(taskId: string) {
  return {
    type: 'system',
    subtype: 'task_updated',
    task_id: taskId,
    patch: { status: 'completed', end_time: Date.now() },
  }
}

function delta(text: string) {
  return {
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'text_delta', text } },
  }
}

export const DEMO_PROMPT =
  '이 저장소 구조를 세 갈래로 나눠 분석해줘. Electron 메인 프로세스, React 렌더러, 테스트 규약을 각각 팀원에게 맡기고 결론만 정리해줘.'

export const DEMO_SCRIPT: DemoBeat[] = [
  {
    afterMs: 700,
    event: assistant([
      {
        type: 'text',
        text: '세 갈래로 나눠 팀원 셋에게 동시에 맡기겠습니다. 각자 자기 worktree 에서 읽기만 하고, 끝나는 대로 결론을 받아 정리해 드리겠습니다.',
      },
    ]),
  },
  {
    afterMs: 900,
    event: assistant([
      agentCall(
        ELECTRON,
        'Electron Developer',
        '메인 프로세스 구조 분석',
        'electron/ 의 프로세스 관리와 IPC 경계를 읽고 결론만 보고해줘.',
      ),
      agentCall(
        REACT,
        'React Developer',
        '렌더러 구조 분석',
        'src/ 의 FSD 레이어와 상태 관리 방식을 읽고 결론만 보고해줘.',
      ),
      agentCall(
        REVIEWER,
        'Code Reviewer',
        '테스트 규약 분석',
        'tests/conventions/ 가 무엇을 강제하는지 읽고 결론만 보고해줘.',
      ),
    ]),
  },
  {
    afterMs: 300,
    event: started('task_1', ELECTRON, 'Electron Developer', '메인 프로세스 구조 분석'),
  },
  { afterMs: 150, event: started('task_2', REACT, 'React Developer', '렌더러 구조 분석') },
  { afterMs: 150, event: started('task_3', REVIEWER, 'Code Reviewer', '테스트 규약 분석') },

  {
    afterMs: 800,
    event: assistant(
      [{ type: 'tool_use', id: 'c1', name: 'Glob', input: { pattern: 'electron/**/*.ts' } }],
      ELECTRON,
    ),
  },
  {
    afterMs: 250,
    event: progress('task_1', ELECTRON, 'electron/ 파일 목록을 훑는 중', 'Glob', 4200),
  },
  {
    afterMs: 400,
    event: assistant(
      [{ type: 'tool_use', id: 'c2', name: 'Glob', input: { pattern: 'src/**/*.tsx' } }],
      REACT,
    ),
  },
  { afterMs: 250, event: progress('task_2', REACT, '렌더러 파일 목록을 훑는 중', 'Glob', 3900) },
  {
    afterMs: 300,
    event: assistant(
      [
        {
          type: 'tool_use',
          id: 'c3',
          name: 'Read',
          input: { file_path: 'tests/conventions/ipc-channels.test.ts' },
        },
      ],
      REVIEWER,
    ),
  },
  {
    afterMs: 250,
    event: progress('task_3', REVIEWER, '규약 테스트를 읽는 중', 'Read', 3100),
    holds: true,
  },

  { afterMs: 500, event: toolResult(ELECTRON, 'c1', '118 files') },
  {
    afterMs: 300,
    event: assistant(
      [
        {
          type: 'tool_use',
          id: 'c4',
          name: 'Read',
          input: { file_path: 'electron/host/agent-host/agent-host.ts' },
        },
      ],
      ELECTRON,
    ),
  },
  {
    afterMs: 400,
    event: progress('task_1', ELECTRON, 'agent-host 의 스폰 경로를 읽는 중', 'Read', 12800),
  },
  { afterMs: 350, event: toolResult(REACT, 'c2', '557 files') },
  {
    afterMs: 300,
    event: assistant(
      [{ type: 'tool_use', id: 'c5', name: 'Grep', input: { pattern: 'useSyncExternalStore' } }],
      REACT,
    ),
  },
  { afterMs: 400, event: progress('task_2', REACT, '상태 저장소 패턴을 찾는 중', 'Grep', 11200) },
  {
    afterMs: 300,
    event: progress('task_3', REVIEWER, '22 개 규약 테스트를 분류하는 중', 'Read', 9800),
  },

  // The orchestrator wants to run a command, and this is where the session
  // stops and asks. The tape holds here until the person answers.
  {
    afterMs: 900,
    event: {
      type: 'control_request',
      request_id: 'req_typecheck',
      request: {
        subtype: 'can_use_tool',
        tool_name: 'Bash',
        input: {
          command: 'npm run typecheck && npm test -- tests/conventions --reporter=dot',
          description: '타입 검사와 규약 테스트를 함께 돌려 현재 상태를 확인',
        },
      },
    },
    holdForAnswer: true,
  },

  {
    afterMs: 600,
    event: assistant([
      {
        type: 'tool_use',
        id: 'c6',
        name: 'Bash',
        input: { command: 'npm run typecheck && npm test -- tests/conventions --reporter=dot' },
      },
    ]),
  },
  {
    afterMs: 1300,
    event: {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'c6', content: '' }],
      },
      tool_use_result: {
        stdout: [
          '> zetrem@1.0.2-beta.5 typecheck',
          '> tsc --noEmit',
          '',
          '> zetrem@1.0.2-beta.5 test',
          '> vitest run tests/conventions --reporter=dot',
          '',
          ' Test Files  22 passed (22)',
          '      Tests  92 passed (92)',
          '   Duration  3.41s',
        ].join('\n'),
        stderr: '',
        interrupted: false,
      },
    },
  },
  {
    afterMs: 900,
    event: progress('task_1', ELECTRON, 'IPC 경계의 sender 검증을 확인하는 중', 'Read', 21400),
  },
  { afterMs: 400, event: toolResult(REACT, 'c5', '6 files') },
  {
    afterMs: 500,
    event: progress('task_2', REACT, 'FSD 레이어 의존 방향을 확인하는 중', 'Grep', 19700),
  },
  {
    afterMs: 600,
    event: progress('task_3', REVIEWER, '규약과 실제 코드의 어긋남을 대조하는 중', 'Grep', 17300),
  },

  {
    afterMs: 1100,
    event: notified(
      'task_3',
      REVIEWER,
      '규약 테스트 22 개를 분류했습니다. IPC 계약·폴더 배치·타입 분리·커밋 형식을 CI 에서 강제하고, 커버리지 임계값과 knip 만 빠져 있습니다.',
    ),
  },
  { afterMs: 150, event: finished('task_3') },
  {
    afterMs: 900,
    event: notified(
      'task_2',
      REACT,
      '렌더러는 외부 상태 라이브러리 없이 클로저 스토어와 useSyncExternalStore 로 일관됩니다. 순수 규칙이 lib 슬라이스로 분리돼 있어 React 없이도 테스트됩니다.',
    ),
  },
  { afterMs: 150, event: finished('task_2') },
  {
    afterMs: 800,
    event: notified(
      'task_1',
      ELECTRON,
      '메인은 CLI 를 자식 프로세스로 띄우고 stdout 을 줄 단위로 렌더러에 넘깁니다. JSON 파싱은 렌더러가 하고, 모든 IPC 에 sender 검증이 걸려 있습니다.',
    ),
    raises: 'proposal',
  },
  { afterMs: 150, event: finished('task_1') },

  { afterMs: 1600, event: delta('세 팀원의 보고를 합쳐 정리했습니다.\n\n') },
  {
    afterMs: 700,
    event: delta(
      '**한 문장:** 메인은 프로세스만 다루고, 해석과 화면은 렌더러가 맡으며, 그 경계를 규약 테스트가 지킵니다.\n\n',
    ),
  },
  {
    afterMs: 800,
    event: delta(
      '- **메인 프로세스** — `claude` 를 자식으로 띄워 stdout 을 줄 단위로 넘길 뿐, JSON 을 해석하지 않습니다. 모든 IPC 채널에 sender 검증이 걸려 있습니다.\n',
    ),
  },
  {
    afterMs: 800,
    event: delta(
      '- **렌더러** — 외부 상태 라이브러리가 없습니다. 클로저 스토어와 `useSyncExternalStore` 로 통일되어 있고, 순수 규칙은 전부 `lib` 으로 빠져 있습니다.\n',
    ),
  },
  {
    afterMs: 800,
    event: delta(
      '- **규약** — 폴더 배치·타입 분리·IPC 계약·커밋 형식까지 22 개의 테스트가 CI 에서 강제합니다. 빈 곳은 커버리지 임계값과 knip 미실행 둘입니다.\n\n',
    ),
  },
  { afterMs: 700, event: delta('개선 후보를 하나 고르시면 그대로 작업으로 넘기겠습니다.') },
  {
    afterMs: 1000,
    event: {
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: '',
      duration_ms: 38_140,
      usage: { input_tokens: 48210, output_tokens: 2615 },
    },
  },
]

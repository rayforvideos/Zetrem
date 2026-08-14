import type { ToolActivity } from '@/pages/workspace/model/conversation'
import { cn } from '@/shared/lib/cn'
import { lineDiff } from '../lib/diff'
import { TOOL_OUTPUT_LINES, moreLine } from '../lib/limits'

/**
 * 도구마다 제 모양으로 — 파일이 바뀌는 것은 diff 로, 할 일은 체크리스트로.
 *
 * 도구 이름 한 줄로는 무엇이 바뀌는지 알 수 없다. 그렇다고 모든 도구에 전용
 * 렌더를 주면 화면이 도구 사전이 된다 — 사람이 결과를 눈으로 확인해야 하는
 * 셋(파일 수정·파일 생성·할 일)만 든다. 나머지는 stdout 이 이미 말한다.
 *
 * 훅을 쓰지 않는다 — `Tick` 이 컴포넌트가 아니라 평범한 함수로 호출해 그 반환값을
 * "그릴 게 있는가" 판정에도 그대로 쓴다. 그래서 이 함수의 **모든 반환 지점**이
 * "그릴 게 없으면 null, 있으면 그 자체" 를 지켜야 한다 — 한 단계 아래 컴포넌트
 * (`Diff`)가 자기 안에서 빈 값을 걸러내는 것으로는 부족하다. 여기서 훅을 쓰게 되면
 * 타입체크도 테스트도 못 잡고 런타임에만 깨진다.
 */
export function ToolDetail({ tool }: { tool: ToolActivity }) {
  const name = toolName(tool)
  const input = toolInput(tool)

  if (name === 'Edit') {
    if (typeof input.old_string !== 'string' || typeof input.new_string !== 'string') return null
    const lines = lineDiff(input.old_string, input.new_string)
    // 두 덩어리가 같으면 diff 가 빈 배열이다 — 그 경우까지 이 함수가 null 을 돌려줘야
    // Tick 의 판정과 실제로 그릴 것이 어긋나지 않는다 (Diff 안의 빈 검사만으론 부족했다)
    if (lines.length === 0) return null
    return <Diff lines={lines} />
  }

  // MultiEdit 의 입력은 한 벌의 old/new 가 아니라 `edits` 배열이다 — Edit 과 같은 가지에
  // 묶어두면 최상위 old_string 을 찾다 못 찾고 전부 null 로 떨어진다. 이름을 걸어놓고
  // 아무것도 안 그리는 것은 "지원한다" 고 말한 화면이 침묵하는 것이라 거짓말과 같다
  if (name === 'MultiEdit') {
    if (!Array.isArray(input.edits)) return null
    const groups = (input.edits as Record<string, unknown>[])
      .filter((edit) => typeof edit?.old_string === 'string' && typeof edit?.new_string === 'string')
      .map((edit) => lineDiff(edit.old_string as string, edit.new_string as string))
      // 바뀐 것이 없는 한 벌은 자리를 차지할 이유가 없다 (Edit 의 빈 diff 규칙과 같다)
      .filter((lines) => lines.length > 0)
    // 한 벌도 못 읽으면 열어봐야 빈 판이다 — 여기서 null 을 돌려줘야 Tick 이 눈금을 잠근다
    if (groups.length === 0) return null
    return (
      <div className="flex flex-col gap-1">
        {groups.map((lines, index) => (
          <Diff key={index} lines={lines} />
        ))}
      </div>
    )
  }

  if (name === 'Write') {
    if (typeof input.content !== 'string') return null
    const lines = lineDiff('', input.content)
    if (lines.length === 0) return null
    return <Diff lines={lines} />
  }

  if (name === 'TodoWrite') {
    if (!Array.isArray(input.todos)) return null
    const todos = (input.todos as Record<string, unknown>[]).filter(
      (todo) => typeof todo?.content === 'string',
    )
    if (todos.length === 0) return null
    return (
      <ul className="flex flex-col gap-0.5">
        {todos.map((todo, index) => {
          const status = typeof todo.status === 'string' ? todo.status : 'pending'
          return (
            <li
              key={`${index}-${String(todo.content)}`}
              className={cn(
                'flex items-baseline gap-1.5 font-mono text-[10.5px] leading-normal',
                status === 'completed' && 'opacity-45 line-through',
                status === 'in_progress' ? 'opacity-100' : 'opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex-none',
                  // 지금 도는 하나만 맥동한다 — 작업 레일과 같은 문법
                  status === 'in_progress' && 'animate-[tile-pulse_2.4s_ease-in-out_infinite]',
                )}
              >
                {status === 'completed' ? '✓' : status === 'in_progress' ? '▸' : '·'}
              </span>
              <span className="[overflow-wrap:anywhere]">{String(todo.content)}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  return null
}

/**
 * 펼칠 수 있는가는 "그려서 무언가 나오는가" 하나로만 판단한다 — 별도의 판별 함수를
 * 두면 그 함수의 빈 값 조건이 위 렌더의 빈 값 조건과 따로 진화해 어긋난다
 * (todos: [] 같은 경우가 실제로 그랬다). ToolDetail 은 훅을 쓰지 않으니 평범한
 * 함수로 호출해 결과를 그대로 판정에 재사용할 수 있다 — Tick 이 그렇게 쓴다.
 */

/** 눈금 한 줄의 첫 낱말이 도구 이름이다 — toolLine 이 그렇게 짓는다 */
function toolName(tool: ToolActivity): string {
  return tool.line.split(' ')[0] ?? ''
}

function toolInput(tool: ToolActivity): Record<string, unknown> {
  return (typeof tool.input === 'object' && tool.input !== null ? tool.input : {}) as Record<
    string,
    unknown
  >
}

/** +/- 는 색이 아니라 기호와 알파로 말한다 (§4.2) */
function Diff({ lines }: { lines: ReturnType<typeof lineDiff> }) {
  if (lines.length === 0) return null
  // 큰 파일을 쓴 Write 하나가 수천 행을 세우면 판이 굳는다 — stdout 과 같은 수에서 멈추고,
  // 몇 줄이 남았는지 같은 말로 알린다 (조용히 자르는 것은 여기서 금지다)
  const shown = lines.slice(0, TOOL_OUTPUT_LINES)
  const rest = lines.length - shown.length
  return (
    <pre className="zt-scroll max-h-56 overflow-auto border-l border-current/20 pl-2 font-mono text-[10.5px] leading-normal whitespace-pre-wrap">
      {shown.map((line, index) => (
        <div key={index} className={line.kind === 'same' ? 'opacity-45' : 'opacity-90'}>
          <span className="mr-1.5 inline-block w-[1ch] opacity-70">
            {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
          </span>
          {line.text}
        </div>
      ))}
      {rest > 0 && <div className="opacity-70">{moreLine(rest)}</div>}
    </pre>
  )
}

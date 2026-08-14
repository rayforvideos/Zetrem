import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import type { ToolActivity, Turn } from '@/pages/workspace/model/conversation'
import { ConversationPane, tickOpen } from './ConversationPane'

const STATUS: StatusState = {
  session: null,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    ttftMs: null,
    turns: 0,
  },
  limit: null,
  hooks: [],
  update: null,
  activity: 'idle',
}

function tool(overrides: Partial<ToolActivity> = {}): ToolActivity {
  return { line: 'Bash ls', toolUseId: 't1', input: null, result: null, ...overrides }
}

function turn(overrides: Partial<Turn> = {}): Turn {
  return {
    role: 'assistant',
    text: '',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: 0,
    ...overrides,
  }
}

function pane(turns: Turn[]): string {
  return renderToStaticMarkup(
    <ConversationPane
      turns={turns}
      status="done"
      statusState={STATUS}
      permission={null}
      nowMs={0}
      permissionMode="ask"
      model="default"
      onModel={() => {}}
      sessionLive={false}
      onSend={() => {}}
      onDecide={() => {}}
      onStop={() => {}}
      onUpdateCli={() => {}}
      updatingCli={false}
    />,
  )
}

/**
 * 산 흐름에서 눈금은 `tool_use` 줄에서 마운트되고 결과는 **그 뒤 줄**로 온다.
 * `useState(tool.result?.isError === true)` 는 초기값을 마운트 때 한 번만 읽으므로
 * 그 순서에서는 실패가 영영 펼쳐지지 않았다 — 스펙의 "실패는 이유가 화면에 있어야
 * 한다" 가 죽어 있던 자리다.
 *
 * vitest 는 `environment: 'node'` 라 마운트 뒤 다시 그릴 렌더러가 없다(jsdom 금지,
 * 새 의존성 금지). 그래서 펼침 판정을 순수 함수로 떼어내 "사람이 아직 손대지 않은
 * 상태(override === null)에서 무엇이 나오는가" 를 직접 본다 — 마운트 시점이 아니라
 * 매 렌더의 도구 값으로 답이 나온다는 것이 이 함수의 존재 이유다.
 */
describe('tickOpen — 실패는 이유가 화면에 있어야 한다', () => {
  it('결과가 마운트 뒤에 도착해도 실패한 눈금은 펼쳐진다', () => {
    const mounted = tool({ result: null })
    expect(tickOpen(null, mounted)).toBe(false) // tool_use 줄만 왔을 때

    // 다음 줄에서 결과가 붙는다 — 같은 눈금, 새 값
    const resolved = tool({
      result: { stdout: '', stderr: 'no such file', isError: true, interrupted: false },
    })
    expect(tickOpen(null, resolved)).toBe(true)
  })

  it('사람이 접었으면 접힌 채로 둔다 — 기본값이 사람의 손을 덮지 않는다', () => {
    const failed = tool({
      result: { stdout: '', stderr: 'boom', isError: true, interrupted: false },
    })
    expect(tickOpen(false, failed)).toBe(false)
    expect(tickOpen(true, tool())).toBe(true)
  })
})

describe('ConversationPane — 화면이 거짓말하지 않는다', () => {
  it('도구 출력은 40줄에서 멈추고 몇 줄이 남았는지 말한다', () => {
    const stdout = Array.from({ length: 100 }, (_, i) => `줄${i}`).join('\n')
    const html = pane([
      turn({
        tools: [tool({ result: { stdout, stderr: '', isError: true, interrupted: false } })],
      }),
    ])
    expect(html).toContain('줄39')
    expect(html).not.toContain('줄40')
    expect(html).toContain('60줄 더 있음')
  })

  /**
   * 눈금 버튼 **자기 자신**만 본다. 같은 판이 `Textarea` 와 `Button` 도 그리는데 그
   * 클래스 문자열에 `disabled:cursor-not-allowed` 같은 변형이 들어 있어서, 마크업 전체에서
   * `'disabled'` 를 찾으면 눈금이 잠기지 않아도 통과한다 — 모양만 보는 단언은 이 브랜치를
   * 두 번 되돌리게 한 종류다. 불리언 속성이 실제로 붙었는지(`disabled=""`)를 확인한다.
   */
  function tickButton(html: string, line: string): string {
    const at = html.indexOf(line)
    expect(at).toBeGreaterThan(-1)
    return html.slice(html.lastIndexOf('<button', at), at)
  }

  it('결과도 전용 렌더도 없는 눈금은 펼칠 수 없다 — 빈 판을 열지 않는다', () => {
    const html = pane([turn({ tools: [tool({ line: 'Bash ls', input: { command: 'ls' } })] })])
    const button = tickButton(html, 'Bash ls')
    expect(button).toContain('disabled=""')
    expect(button).toContain('aria-expanded="false"')
  })

  it('결과가 붙은 눈금은 잠기지 않는다 — 위 단언이 늘 참이 되지 않게 반대편도 건다', () => {
    const html = pane([
      turn({
        tools: [
          tool({
            line: 'Bash ls',
            result: { stdout: 'a.ts', stderr: '', isError: false, interrupted: false },
          }),
        ],
      }),
    ])
    expect(tickButton(html, 'Bash ls')).not.toContain('disabled=""')
  })

  it('생각은 접힌 채로 서고 몇 문단인지 말한다 — 결론이 먼저다', () => {
    const html = pane([turn({ thinking: '첫 문단\n\n둘째 문단\n\n셋째 문단' })])
    expect(html).toContain('생각 3문단')
    expect(html).not.toContain('둘째 문단')
  })

  it('기계가 알려주는 줄은 고정폭이고 작업 레일을 달지 않는다', () => {
    const html = pane([turn({ role: 'system', text: '이 턴 261출력 · 10.5초' })])
    expect(html).toContain('이 턴 261출력')
    const line = html.slice(html.indexOf('이 턴') - 300, html.indexOf('이 턴'))
    expect(line).toContain('font-mono')
    expect(line).not.toContain('zt-rail')
  })
})

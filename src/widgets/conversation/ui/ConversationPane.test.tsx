import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PermissionAsk, StatusState } from '@/entities/agent-session'
import type { ToolActivity, Turn } from '@/pages/workspace/model/conversation'
import { modifierKey } from '@/shared/lib/platform'
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

function pane(turns: Turn[], permission: PermissionAsk | null = null): string {
  return renderToStaticMarkup(
    <ConversationPane
      turns={turns}
      status="done"
      statusState={STATUS}
      permission={permission}
      nowMs={0}
      permissionMode="ask"
      onPermissionMode={() => {}}
      model="default"
      onModel={() => {}}
      sessionLive={false}
      onSend={() => {}}
      onDecide={() => {}}
      onStop={() => {}}
      onUpdateCli={() => {}}
      updatingCli={false}
      roster={[]}
      fleet={[]}
      sidebar={null}
      report={null}
      addressee={null}
      onClearAddressee={() => {}}
    />,
  )
}

describe('tickOpen — 실패는 이유가 화면에 있어야 한다', () => {
  it('결과가 마운트 뒤에 도착해도 실패한 눈금은 펼쳐진다', () => {
    const mounted = tool({ result: null })
    expect(tickOpen(null, mounted)).toBe(false)

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
  it('도구 출력은 40 lines에서 멈추고 몇 줄이 남았는지 말한다', () => {
    const stdout = Array.from({ length: 100 }, (_, i) => `줄${i}`).join('\n')
    const html = pane([
      turn({
        tools: [tool({ result: { stdout, stderr: '', isError: true, interrupted: false } })],
      }),
    ])
    expect(html).toContain('줄39')
    expect(html).not.toContain('줄40')
    expect(html).toContain('60 more lines')
  })

  function tickButton(html: string, tickId: string): string {
    const at = html.indexOf(`data-tick="${tickId}"`)
    expect(at).toBeGreaterThan(-1)
    const start = html.lastIndexOf('<button', at)
    const end = html.indexOf('</button>', at)
    return html.slice(start, end)
  }

  it('결과도 전용 렌더도 없는 눈금은 펼칠 수 없다 — 빈 판을 열지 않는다', () => {
    const html = pane([
      turn({ tools: [tool({ line: 'Bash ls', toolUseId: 'tk1', input: { command: 'ls' } })] }),
    ])
    const button = tickButton(html, 'tk1')
    expect(button).toContain('disabled=""')
    expect(button).toContain('aria-expanded="false"')
  })

  it('결과가 붙은 눈금은 잠기지 않는다 — 위 단언이 늘 참이 되지 않게 반대편도 건다', () => {
    const html = pane([
      turn({
        tools: [
          tool({
            line: 'Bash ls',
            toolUseId: 'tk2',
            result: { stdout: 'a.ts', stderr: '', isError: false, interrupted: false },
          }),
        ],
      }),
    ])
    expect(tickButton(html, 'tk2')).not.toContain('disabled=""')
  })

  it('생각은 접힌 채로 서고 몇 문단인지 말한다 — 결론이 먼저다', () => {
    const html = pane([turn({ thinking: '첫 문단\n\n둘째 문단\n\n셋째 문단' })])
    expect(html).toContain('Thought · 3 paragraphs')
    expect(html).not.toContain('둘째 문단')
  })

  it('기계가 알려주는 줄은 고정폭이고 작업 레일을 달지 않는다', () => {
    const html = pane([turn({ role: 'system', text: 'This turn: 261 out · 10.5s' })])
    expect(html).toContain('This turn: 261 out')
    const at = html.indexOf('This turn')
    const line = html.slice(html.lastIndexOf('<div', at), at)
    expect(line).toContain('font-mono')
    expect(line).not.toContain('zt-rail')
  })
})

describe('결재 — 이 앱에서 가장 중요한 순간', () => {
  const ask = { requestId: 'r1', toolName: 'Bash', line: 'rm -rf build' }

  it('무엇을 하려는지 사람 말로 먼저 말한다', () => {
    const html = pane([], ask)
    expect(html).toContain('Run this command?')
    expect(html).toContain('rm -rf build')
  })

  it('손이 키보드를 떠나지 않아도 끝난다 — 단축키를 화면이 알려준다', () => {
    const html = pane([], ask)
    const keys = [...html.matchAll(/<kbd[^>]*>([^<]*)<\/kbd>/g)].map((match) => match[1])
    expect(keys, '허용은 수정키+Enter, 거부는 Esc').toEqual(
      expect.arrayContaining([modifierKey(), 'Enter', 'Esc']),
    )
  })

  it('결재 중에는 입력 자리가 없다 — 답할 것은 하나뿐이다', () => {
    expect(pane([], ask)).not.toContain('Keep going')
  })

  it('모르는 도구도 물어본다 — 이름을 지어내지 않는다', () => {
    const html = pane([], { requestId: 'r2', toolName: 'SomeTool', line: '무언가' })
    expect(html).toContain('Allow this?')
    expect(html).toContain('SomeTool')
  })
})

describe('지목 — 누구에게 맡기는지가 쓰는 자리에 보인다', () => {
  it('지목한 사람이 입력 위에 서고 물음도 그 사람을 향한다', () => {
    const html = renderToStaticMarkup(
      <ConversationPane
        turns={[]}
        status="done"
        statusState={STATUS}
        permission={null}
        nowMs={0}
        permissionMode="ask"
        onPermissionMode={() => {}}
        model="default"
        onModel={() => {}}
        sessionLive={false}
        onSend={() => {}}
        onDecide={() => {}}
        onStop={() => {}}
        onUpdateCli={() => {}}
        updatingCli={false}
        roster={[]}
        fleet={[]}
        sidebar={null}
        report={null}
        addressee="Explore"
        onClearAddressee={() => {}}
      />,
    )
    expect(html).toContain('To Explore')
    expect(html).toContain('Task for Explore')
  })
})

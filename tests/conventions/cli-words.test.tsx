import { i18n } from '@lingui/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AgentSession, PermissionAsk, StatusState } from '@/entities/agent-session'
import { saidPlainly } from '@/entities/claude-cli'
import { resultNote } from '@/entities/tool'
import { AgentReport } from '@/widgets/agent-report/ui/AgentReport/AgentReport'
import { troubleLine } from '@/widgets/agent-report/lib/review/review'
import { Approval } from '@/widgets/conversation/ui/ConversationPane/Approval'
import { tokenLabel } from '@/widgets/conversation/lib/working/working'
import { gauges } from '@/widgets/status-bar/lib/format/format'
import { StatusDrawer } from '@/widgets/status-bar/ui/StatusDrawer/StatusDrawer'
import { Gauge } from '@/widgets/tile-deck/ui/layers/Gauge/Gauge'

// The catalog is complete; what leaks is the values passing through it. These
// are the CLI's own tokens, and none of them is a word anybody chose to show.
const CLI_WORDS = [
  'subagent',
  'ExitPlanMode',
  'AskUserQuestion',
  'bypassPermissions',
  'claude-haiku-4-5-20251001',
  'The user denied this tool call',
  'worktree-agent-',
  ' tokens',
  ' lines',
  'MCP',
]

// Read in the language the leaks were reported in, since a screen speaking
// English has nothing to tell apart.
beforeAll(() => i18n.activate('ko'))
afterAll(() => i18n.activate('en'))

function noneOf(html: string, words: readonly string[] = CLI_WORDS): void {
  for (const word of words) {
    expect(html, `${word} is the CLI's word, not the app's`).not.toContain(word)
  }
}

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'subagent',
    label: '리뷰',
    subagentType: 'code-reviewer',
    model: 'subagent',
    status: 'done',
    headline: '두 자리를 고쳤습니다',
    stream: [],
    transcript: [],
    tokens: 15_800,
    contextUsed: 0.2,
    startedAtMs: 1000,
    endedAtMs: 21000,
    agentId: 'a92fb6e936b5605b5',
    ...overrides,
  }
}

function ask(overrides: Partial<PermissionAsk> = {}): PermissionAsk {
  return { requestId: 'r1', toolName: 'Write', line: 'Write a.ts', detail: 'a.ts', ...overrides }
}

const STATUS: StatusState = {
  usage: 'read',
  usageAtMs: null,
  probed: false,
  session: {
    id: 'f77f771b',
    cwd: '/work/app',
    model: 'claude-haiku-4-5-20251001',
    permissionMode: 'bypassPermissions',
    cliVersion: '2.1.231',
    mcp: [{ name: 'playwright', status: 'connected' }],
    tools: [],
    agents: [],
  },
  context: { used: 100_000, window: 1_000_000 },
  cost: {
    usd: 0.19,
    lastTurnUsd: 0.04,
    tokens: { in: 6, out: 261, cacheRead: 76_424, cacheCreate: 14_862 },
    durationMs: 10_485,
    turns: 3,
  },
  limits: [],
  update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
  activity: 'idle',
}

describe('an approval card asks in the app’s words, not the CLI’s', () => {
  it.each([
    ['Write', '파일 쓰기'],
    ['Bash', '명령 실행'],
    ['ExitPlanMode', '계획 승인'],
    ['AskUserQuestion', '질문에 답하기'],
  ])('names %s as something a person would say', (toolName, said) => {
    const html = renderToStaticMarkup(<Approval ask={ask({ toolName })} onDecide={() => {}} />)
    expect(html).toContain(said)
    noneOf(html)
  })
})

describe('a teammate report names the teammate, not the placeholder', () => {
  function report(overrides: Partial<AgentSession> = {}): string {
    return renderToStaticMarkup(
      <AgentReport
        session={session(overrides)}
        sessions={[session(overrides)]}
        helpers={[session({ id: 's2', subagentType: 'general-purpose', label: '조사' })]}
        nowMs={61_000}
        onClose={() => {}}
        onPick={() => {}}
      />,
    )
  }

  it('leaves the crew store’s placeholder off the header', () => {
    noneOf(report())
  })

  it('says which model when the run actually had one', () => {
    expect(report({ model: 'claude-haiku-4-5-20251001' })).toContain('Haiku')
  })
})

describe('the session detail speaks the vocabulary the settings pane does', () => {
  it('gives the mode and the model their labels', () => {
    const html = renderToStaticMarkup(
      <StatusDrawer
        appVersion={null}
        connectors={[]}
        checking={false}
        onRecheck={() => {}}
        statusState={STATUS}
        onUpdate={() => {}}
        updating={false}
      />,
    )
    expect(html).toContain('전부 허용')
    expect(html).toContain('Haiku')
    noneOf(html)
  })

  it('calls a connector a connector in the bar as well as in the drawer', () => {
    const found = gauges(STATUS).find((one) => one.key === 'mcp')
    expect(found?.label).toBe('커넥터')
  })
})

describe('a count carries its unit in the language being spoken', () => {
  it('sets the unit beside the number on a tile', () => {
    const html = renderToStaticMarkup(<Gauge session={session()} nowMs={61_000} />)
    expect(html).toContain('토큰')
    noneOf(html)
  })

  it('counts the lines a report kept in the same words the conversation uses', () => {
    expect(resultNote({ kind: 'file', verb: 'read', dir: '', name: 'a.ts' }, 'a\nb\nc\nd')).toBe(
      '4줄',
    )
  })

  it('says what a run has written without borrowing the CLI’s shorthand', () => {
    expect(tokenLabel(15_800)).not.toContain('out')
  })
})

describe('a refusal and a lost worktree read as the app’s own', () => {
  it('swaps the sentence Zetrem itself sent the CLI', () => {
    expect(saidPlainly('The user denied this tool call')).toBe('거부했습니다.')
  })

  it('leaves anything a tool genuinely printed alone', () => {
    expect(saidPlainly('error: no such file')).toBe('error: no such file')
  })

  it('names the teammate where the branch used to stand', () => {
    const said = troubleLine({ code: 'failed', said: 'worktree-agent-a92fb6e936b5605b5' }, '리뷰')
    expect(said).toContain('리뷰')
    noneOf(said)
  })
})

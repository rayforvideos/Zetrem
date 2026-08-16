import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PermissionAsk, StatusState } from '@/entities/agent-session'
import type { ToolActivity, Turn } from '@/entities/conversation'
import { modifierKey } from '@/shared/lib/platform/platform'
import { TOOL_OUTPUT_LINES } from '../../lib/limits'
import { ConversationPane } from './ConversationPane'
import { Composer } from '../Composer/Composer'
import { tickOpen } from './Tick'

const STATUS: StatusState = {
  usage: 'read',
  session: null,
  probed: false,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    ttftMs: null,
    turns: 0,
  },
  limits: [],
  hooks: [],
  update: null,
  activity: 'idle',
}

function tool(overrides: Partial<ToolActivity> = {}): ToolActivity {
  return { line: 'Bash ls', toolUseId: 't1', input: null, result: null, startedAtMs: 0, endedAtMs: 100, ...overrides }
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

function working(turns: Turn[]): string {
  return renderToStaticMarkup(
    <ConversationPane
      turns={turns}
      status="working"
      statusState={{ ...STATUS, cost: { ...STATUS.cost, tokens: { ...STATUS.cost.tokens, out: 1240 } } }}
      permission={null}
      chores={[]}
      you={{ name: 'Ray', face: 'onigiri' }}
      away={null}
      nowMs={12_000}
      onDecide={() => {}}
      sidebar={null}
      report={null}
      composer={<Composer
        empty={turns.length === 0}
        busy={false}
        sessionLive={false}
        addressee={null}
        permissionMode="ask"
        model="default"
        refusedModels={[]}
        files={[]}
        onPick={() => {}}
        onTake={() => {}}
        onDropFile={() => {}}
        onSend={() => {}}
        onStop={() => {}}
        onClearAddressee={() => {}}
        onPermissionMode={() => {}}
        onModel={() => {}}
      />}
    />,
  )
}

function pane(turns: Turn[], permission: PermissionAsk | null = null): string {
  return renderToStaticMarkup(
    <ConversationPane
      turns={turns}
      status="done"
      statusState={STATUS}
      permission={permission}
      chores={[]}
      you={{ name: 'Ray', face: 'onigiri' }}
      away={null}
      nowMs={0}
      onDecide={() => {}}
      sidebar={null}
      report={null}
      composer={<Composer
        empty={turns.length === 0}
        busy={false}
        sessionLive={false}
        addressee={null}
        permissionMode="ask"
        model="default"
        refusedModels={[]}
        files={[]}
        onPick={() => {}}
        onTake={() => {}}
        onDropFile={() => {}}
        onSend={() => {}}
        onStop={() => {}}
        onClearAddressee={() => {}}
        onPermissionMode={() => {}}
        onModel={() => {}}
      />}
    />,
  )
}

describe('tickOpen: nothing is folded away', () => {
  it('is open until touched, so nobody has to click to see what was done', () => {
    expect(tickOpen(null)).toBe(true)
  })

  it('stays shut once a person shut it, since a default does not overrule a hand', () => {
    expect(tickOpen(false)).toBe(false)
    expect(tickOpen(true)).toBe(true)
  })
})

describe('ConversationPane: the screen does not lie', () => {
  it('stops tool output at the cap and counts what was left out', () => {
    const stdout = Array.from({ length: TOOL_OUTPUT_LINES + 60 }, (_, i) => `줄${i}`).join('\n')
    const html = pane([
      turn({
        tools: [tool({ result: { stdout, stderr: '', isError: true, interrupted: false } })],
      }),
    ])
    expect(html).toContain(`줄${TOOL_OUTPUT_LINES - 1}`)
    expect(html).not.toContain(`줄${TOOL_OUTPUT_LINES}\n`)
    expect(html).toContain('60 more lines')
  })

  function tickButton(html: string, tickId: string): string {
    const at = html.indexOf(`data-tick="${tickId}"`)
    expect(at).toBeGreaterThan(-1)
    const start = html.lastIndexOf('<button', at)
    const end = html.indexOf('</button>', at)
    return html.slice(start, end)
  }

  it('cannot open a row with nothing behind it, rather than opening an empty drawer', () => {
    const html = pane([
      turn({ tools: [tool({ line: 'Bash ls', toolUseId: 'tk1', input: { command: 'ls' } })] }),
    ])
    const button = tickButton(html, 'tk1')
    expect(button).toContain('disabled=""')
    expect(button).toContain('aria-expanded="false"')
  })

  it('leaves a row with a result open to click, so the test above cannot pass by accident', () => {
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

  it('folds thinking away and says how long it is, because the answer comes first', () => {
    const html = pane([turn({ thinking: '첫 문단\n\n둘째 문단\n\n셋째 문단' })])
    expect(html).toContain('Thought · 3 paragraphs')
    expect(html).not.toContain('둘째 문단')
  })

  it('sets a machine line in monospace and hangs no work rail on it', () => {
    const html = pane([turn({ role: 'system', text: 'This turn: 261 out · 10.5s' })])
    expect(html).toContain('This turn: 261 out')
    const at = html.indexOf('This turn')
    const line = html.slice(html.lastIndexOf('<div', at), at)
    expect(line).toContain('font-mono')
    expect(line).not.toContain('zt-rail')
  })
})

describe('the screen is not blank while an answer is on its way', () => {
  it('shows what is happening and how long it has taken as soon as you send', () => {
    const html = working([turn({ role: 'user', text: '고쳐줘' })])
    expect(html).toContain('data-working')
    expect(html).toContain('Starting')
    expect(html).toContain('12s')
  })

  it('names the running tool as the thing being done', () => {
    const html = working([
      turn({
        startedAtMs: 2_000,
        tools: [tool({ line: 'Bash npm test', input: { command: 'npm test' } })],
      }),
    ])
    expect(html).toContain('Running')
    expect(html).toContain('10s')
  })

  it('takes the line away when the work is done', () => {
    expect(pane([turn({ text: '다 했다' })])).not.toContain('data-working')
  })
})

describe('approval: the most important moment in this app', () => {
  const ask = { requestId: 'r1', toolName: 'Bash', line: 'Bash rm -rf build', detail: 'rm -rf build' }

  it('says what it wants to do in plain words first', () => {
    const html = pane([], ask)
    expect(html).toContain('Run this command?')
    expect(html).toContain('rm -rf build')
  })

  it('can be answered without leaving the keyboard, and says which keys', () => {
    const html = pane([], ask)
    const keys = [...html.matchAll(/<kbd[^>]*>([^<]*)<\/kbd>/g)].map((match) => match[1])
    expect(keys, '허용은 수정키+Enter, 거부는 Esc').toEqual(
      expect.arrayContaining([modifierKey(), 'Enter', 'Esc']),
    )
  })

  it('takes the composer away while deciding, because there is only one thing to answer', () => {
    expect(pane([], ask)).not.toContain('Keep going')
  })

  it('asks about a tool it does not know, without inventing a name for it', () => {
    const html = pane([], { requestId: 'r2', toolName: 'SomeTool', line: '무언가', detail: '무언가' })
    expect(html).toContain('Allow this?')
    expect(html).toContain('SomeTool')
  })
})



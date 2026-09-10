import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PermissionAsk, StatusState } from '@/entities/agent-session'
import type { LibraryProposal } from '@/entities/library'
import type { ToolActivity, Turn } from '@/entities/conversation'
import { modifierKey } from '@/shared/lib/platform/platform'
import { TOOL_OUTPUT_LINES } from '../../lib/limits/limits'
import { ConversationPane } from './ConversationPane'
import { Composer } from '../Composer/Composer'
import { Away } from './Away'
import { Working } from './Working'
import { Tick, tickOpen } from './Tick'

const STATUS: StatusState = {
  usage: 'read',
  usageAtMs: null,
  session: null,
  probed: false,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    turns: 0,
  },
  limits: [],
  update: null,
  activity: 'idle',
}

function tool(overrides: Partial<ToolActivity> = {}): ToolActivity {
  return {
    line: 'Bash ls',
    toolUseId: 't1',
    input: null,
    result: null,
    startedAtMs: 0,
    endedAtMs: 100,
    ...overrides,
  }
}

const PROJECT = '/work/app'

let seq = 0

function turn(overrides: Partial<Turn> = {}): Turn {
  return {
    id: `turn-${seq++}`,
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
      statusState={{
        ...STATUS,
        cost: { ...STATUS.cost, tokens: { ...STATUS.cost.tokens, out: 1240 } },
      }}
      permission={null}
      proposals={[]}
      chatTitleOf={() => null}
      onAcceptProposal={() => {}}
      onDismissProposal={() => {}}
      chores={[]}
      you={{ name: 'Ray', face: 'onigiri' }}
      away={null}
      nowMs={12_000}
      project={PROJECT}
      onDecide={() => {}}
      onFileTurn={() => {}}
      hint={false}
      onHintSeen={() => {}}
      report={null}
      composer={
        <Composer
          empty={turns.length === 0}
          busy={false}
          sessionLive={false}
          addressee={null}
          permissionMode="ask"
          runningPermissionMode={null}
          runningModel={null}
          onRestart={() => {}}
          model="default"
          effort="default"
          refusedModels={[]}
          enterSends={true}
          library
          files={[]}
          onPick={() => {}}
          onTake={() => {}}
          onDropFile={() => {}}
          onSend={() => {}}
          onStop={() => {}}
          onClearAddressee={() => {}}
          onPermissionMode={() => {}}
          onModel={() => {}}
          onEffort={() => {}}
          onLibrary={() => {}}
        />
      }
    />,
  )
}

function pane(
  turns: Turn[],
  permission: PermissionAsk | null = null,
  proposals: LibraryProposal[] = [],
): string {
  return renderToStaticMarkup(
    <ConversationPane
      turns={turns}
      status="done"
      statusState={STATUS}
      permission={permission}
      proposals={proposals}
      chatTitleOf={() => null}
      onAcceptProposal={() => {}}
      onDismissProposal={() => {}}
      chores={[]}
      you={{ name: 'Ray', face: 'onigiri' }}
      away={null}
      nowMs={0}
      project={PROJECT}
      onDecide={() => {}}
      onFileTurn={() => {}}
      hint={false}
      onHintSeen={() => {}}
      report={null}
      composer={
        <Composer
          empty={turns.length === 0}
          busy={false}
          sessionLive={false}
          addressee={null}
          permissionMode="ask"
          runningPermissionMode={null}
          runningModel={null}
          onRestart={() => {}}
          model="default"
          effort="default"
          refusedModels={[]}
          enterSends={true}
          library
          files={[]}
          onPick={() => {}}
          onTake={() => {}}
          onDropFile={() => {}}
          onSend={() => {}}
          onStop={() => {}}
          onClearAddressee={() => {}}
          onPermissionMode={() => {}}
          onModel={() => {}}
          onEffort={() => {}}
          onLibrary={() => {}}
        />
      }
    />,
  )
}

describe('tickOpen: a run that went fine folds away', () => {
  it('starts shut, since most output only proves the tool ran', () => {
    expect(tickOpen(null, false)).toBe(false)
  })

  it('starts open when the run failed, which is the part worth reading', () => {
    expect(tickOpen(null, true)).toBe(true)
  })

  it('a hand overrules the default, both ways', () => {
    expect(tickOpen(true, false)).toBe(true)
    expect(tickOpen(false, true)).toBe(false)
  })
})

const SCRIPT = 'set -e\nnpm run build\nnpm test'

function tick(overrides: Partial<ToolActivity> = {}): string {
  return renderToStaticMarkup(
    <Tick
      tool={tool({ line: 'Bash set -e', input: { command: SCRIPT }, ...overrides })}
      live={false}
      project={PROJECT}
    />,
  )
}

describe('a long command does not take the conversation over', () => {
  it('keeps a folded row to the first line of a script', () => {
    const html = tick()
    expect(html).toContain('set -e …')
    expect(html).not.toContain('npm run build')
  })

  it('holds that line to one line rather than wrapping it down the page', () => {
    expect(tick()).toContain('truncate')
  })

  it('can be opened before the command comes back, since the row is all there is', () => {
    expect(tick()).not.toContain('disabled=""')
  })

  it('shows the command whole above the output once the row is open', () => {
    const html = tick({ result: { stdout: 'boom', stderr: '', isError: true, interrupted: false } })
    expect(html).toContain('data-command')
    expect(html).toContain('npm run build')
    expect(html.indexOf('data-command'), 'the command reads before its output').toBeLessThan(
      html.lastIndexOf('boom'),
    )
  })

  it('leaves a command the row already showed whole out of the opened part', () => {
    const html = tick({
      input: { command: 'npm test' },
      result: { stdout: 'boom', stderr: '', isError: true, interrupted: false },
    })
    expect(html).not.toContain('data-command')
  })
})

describe('a quiet run keeps its log to itself', () => {
  it('shows a line count instead of the log, until somebody asks', () => {
    const stdout = ['하나', '둘', '셋'].join('\n')
    const html = pane([
      turn({
        tools: [tool({ result: { stdout, stderr: '', isError: false, interrupted: false } })],
      }),
    ])
    expect(html).toContain('3 lines')
    expect(html).not.toContain('하나')
  })

  it('says how much is held back once, not once in each language', () => {
    const stdout = ['하나', '둘', '셋'].join('\n')
    const html = pane([
      turn({
        tools: [
          tool({
            line: 'Read /work/app/a.ts',
            input: { file_path: '/work/app/a.ts' },
            result: { stdout, stderr: '', isError: false, interrupted: false },
          }),
        ],
      }),
    ])
    expect(html.match(/3 lines/g), 'one count, in the language the app speaks').toHaveLength(1)
  })

  it('lays a failed run open on arrival', () => {
    const stdout = ['하나', '둘'].join('\n')
    const html = pane([
      turn({
        tools: [tool({ result: { stdout, stderr: '', isError: true, interrupted: false } })],
      }),
    ])
    expect(html).toContain('하나')
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

  it('draws a tool run where it happened, between the words before and after it', () => {
    const before = '읽어 보겠습니다'
    const html = pane([
      turn({
        text: `${before}\n\n고쳤습니다`,
        tools: [tool({ line: 'Read /work/app/a.ts', toolUseId: 'tk3', at: before.length })],
      }),
    ])
    const saidBefore = html.indexOf(before)
    const ran = html.indexOf('data-tick="tk3"')
    const saidAfter = html.indexOf('고쳤습니다')
    expect(saidBefore).toBeGreaterThan(-1)
    expect(ran).toBeGreaterThan(saidBefore)
    expect(saidAfter).toBeGreaterThan(ran)
  })

  it('hangs one library button on a reply, however many tools ran inside it', () => {
    const html = pane([
      turn({
        text: '하나\n\n둘\n\n셋',
        tools: [tool({ toolUseId: 'tk4', at: 2 }), tool({ toolUseId: 'tk5', at: 6 })],
      }),
    ])
    expect(html.match(/data-file-turn/g)).toHaveLength(1)
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
  const ask = {
    requestId: 'r1',
    toolName: 'Bash',
    line: 'Bash rm -rf build',
    detail: 'rm -rf build',
  }

  it('says what it wants to do in plain words first', () => {
    const html = pane([], ask)
    expect(html).toContain('Run this command?')
    expect(html).toContain('rm -rf build')
  })

  it('can be answered without leaving the keyboard, and says which keys', () => {
    const html = pane([], ask)
    const keys = [...html.matchAll(/<kbd[^>]*>([^<]*)<\/kbd>/g)].map((match) => match[1])
    expect(keys, 'allow is modifier and Enter, deny is Esc').toEqual(
      expect.arrayContaining([modifierKey(), 'Enter', 'Esc']),
    )
  })

  it('takes the composer away while deciding, because there is only one thing to answer', () => {
    expect(pane([], ask)).not.toContain('Keep going')
  })

  it('shows the plan it is asking about, rendered rather than in one line', () => {
    const html = pane([], {
      requestId: 'r3',
      toolName: 'ExitPlanMode',
      line: 'ExitPlanMode',
      detail: '',
      plan: '## Steps\n\n1. Read `run-config.ts`\n2. Add the flag',
    })
    expect(html).toContain('Approve this plan?')
    expect(html).toContain('data-plan')
    expect(html).toContain('<h2')
    expect(html).toContain('<ol')
    expect(html).toContain('Add the flag')
  })

  it('withholds standing approval for a plan, so the next one is read too', () => {
    const planned = pane([], {
      requestId: 'r4',
      toolName: 'ExitPlanMode',
      line: 'ExitPlanMode',
      detail: '',
      plan: 'Do the thing',
    })
    expect(planned).not.toContain('ask again this session')
    expect(planned).toContain('Allow')
    expect(planned).toContain('Deny')
    expect(pane([], ask), 'other tools keep it').toContain('ask again this session')
  })

  it('is allowed most of the window, and scrolls inside it, rather than cutting the body off', () => {
    const html = pane([], ask)
    expect(html).toContain('max-h-[60vh]')
    expect(html, 'the body takes the tab stop, so a cut body can still be scrolled').toMatch(
      /<section[^>]*tabindex="0"/,
    )
  })

  it('shows what a write would put in the file, not only the path', () => {
    const html = pane([], {
      requestId: 'r5',
      toolName: 'Write',
      line: 'Write src/sub.js',
      detail: 'src/sub.js',
      change: [
        [
          { kind: 'add' as const, text: 'const a = 1' },
          { kind: 'add' as const, text: 'const b = 2' },
        ],
      ],
      count: { added: 2, removed: 0 },
    })
    expect(html).toContain('Write this file?')
    expect(html).toContain('src/sub.js')
    expect(html).toContain('const b = 2')
    expect(html).toMatch(/data-change[^>]*>[\s\S]*?\+2/)
  })

  it('folds a long change and offers the whole of it, so the buttons stay in view', () => {
    const lines = Array.from({ length: 40 }, (_, at) => ({
      kind: 'add' as const,
      text: `line ${at}`,
    }))
    const html = pane([], {
      requestId: 'r6',
      toolName: 'Edit',
      line: 'Edit src/big.ts',
      detail: 'src/big.ts',
      change: [lines],
      count: { added: 40, removed: 0 },
    })
    expect(html).toContain('line 0')
    expect(html, 'the tail waits behind the button').not.toContain('line 39')
    expect(html).toContain('Show the whole change')
  })

  it('asks about a tool it does not know, without inventing a name for it', () => {
    const html = pane([], {
      requestId: 'r2',
      toolName: 'SomeTool',
      line: '무언가',
      detail: '무언가',
    })
    expect(html).toContain('Allow this?')
    expect(html).toContain('SomeTool')
  })
})

const WAITING = {
  verb: '기다리는 중',
  count: 3,
  name: '',
  subagentType: '',
  doing: '',
  sinceMs: 0,
  many: '팀원 3명',
}

describe('an answer can be filed to the library on its own', () => {
  it('offers the per-answer action once the answer is in and settled', () => {
    const html = pane([turn({ text: '다 했다' })])
    expect(html).toContain('data-file-turn')
    expect(html).toContain('To the library')
  })

  it('shows that action outright rather than waiting for the pointer to find it', () => {
    const html = pane([turn({ text: '다 했다' })])
    const at = html.indexOf('data-file-turn')
    expect(html.slice(at, at + 400)).not.toContain('opacity-0')
  })

  it('keeps the action off the streaming answer, since it is not written yet', () => {
    const html = working([turn({ role: 'user', text: '고쳐줘' }), turn({ text: '쓰는 중' })])
    expect(html).not.toContain('data-file-turn')
  })
})

describe('the row that says the team is still out', () => {
  it('shimmers its verb the way the working row does', () => {
    const html = renderToStaticMarkup(<Away away={WAITING} face="onigiri" nowMs={36_000} />)
    expect(html).toContain('zt-shimmer')
  })

  it('wears the same verb treatment as the row it stands in for', () => {
    const shimmerOf = (html: string): string | undefined =>
      html.match(/class="([^"]*zt-shimmer[^"]*)"/)?.[1]
    const mine = shimmerOf(
      renderToStaticMarkup(<Away away={WAITING} face="onigiri" nowMs={36_000} />),
    )
    const theirs = shimmerOf(
      renderToStaticMarkup(
        <Working turns={[]} face="onigiri" nowMs={36_000} startedAtMs={0} tokensOut={0} />,
      ),
    )
    expect(mine).toBe(theirs)
  })
})

const SUGGESTED: LibraryProposal = {
  id: 'p1',
  folder: '',
  title: 'Auth choice',
  body: 'We went with sessions.',
  tags: [],
  proposedAtMs: 0,
  session: '',
  by: '',
}

const ASK: PermissionAsk = {
  requestId: 'r1',
  toolName: 'Bash',
  line: 'Bash ls',
  detail: 'ls',
}

describe('a suggestion for the library, over the message box', () => {
  it('shows the oldest one waiting, and keeps the message box under it', () => {
    const html = pane([turn({ text: '됐어' })], null, [
      SUGGESTED,
      { ...SUGGESTED, id: 'p2', title: 'Later' },
    ])
    expect(html).toContain('data-proposal="p1"')
    expect(html).not.toContain('data-proposal="p2"')
    expect(html).toContain('1 more waiting')
    expect(html.indexOf('data-proposal="p1"')).toBeLessThan(html.indexOf('<textarea'))
  })

  it('stands aside for a permission, which is the one thing that takes the box', () => {
    const html = pane([turn({ text: '됐어' })], ASK, [SUGGESTED])
    expect(html).toContain('data-approval')
    expect(html).not.toContain('data-proposal=')
  })

  it('is not there when nothing has been suggested', () => {
    expect(pane([turn({ text: '됐어' })])).not.toContain('data-proposal=')
  })

  it('shows the same card over the greeting, before any turn has been sent', () => {
    const html = pane([], null, [SUGGESTED])
    expect(html).toContain('data-proposal="p1"')
    expect(html.indexOf('data-proposal="p1"')).toBeLessThan(html.indexOf('<textarea'))
  })
})

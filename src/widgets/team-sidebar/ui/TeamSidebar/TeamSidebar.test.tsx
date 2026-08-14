import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamSidebar } from './TeamSidebar'
import type { StatusState } from '@/entities/agent-session'
import type { TeamMember } from '../../lib/team/team.types'
import { SIDEBAR } from '@/shared/config/theme'

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    type: 'code-reviewer',
    name: 'code-reviewer',
    description: 'Looks at what changed',
    model: 'sonnet',
    character: null,
    origin: 'project',
    loaded: false,
    callable: false,
    state: 'idle',
    note: null,
    sessionId: null,
    ...overrides,
  }
}

const IDLE: StatusState = {
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
  limits: [],
  hooks: [],
  update: null,
  activity: 'idle',
}

function bar(props: Partial<Parameters<typeof TeamSidebar>[0]> = {}): string {
  return renderToStaticMarkup(
    <TeamSidebar
      members={[member()]}
      sessionKnown={false}
      canWrite
      note={null}
      knownTools={[]}
      status={IDLE}
      sessionLive={false}
      onRestart={() => {}}
      stock={[]}
      stockOn={[]}
      onStock={() => {}}
      chats={[]}
      openChatId={null}
      nowMs={0}
      onOpenChat={() => {}}
      onStartChat={() => {}}
      onRemoveChat={() => {}}
      width={SIDEBAR.width}
      onResize={() => {}}
      onResizeEnd={() => {}}
      onHire={() => {}}
      onPick={() => {}}
      onAddress={() => {}}
      onRelease={() => {}}
      onEdit={() => {}}
      drafts={new Map()}
      {...props}
    />,
  )
}

describe('TeamSidebar: pressing something always does something', () => {
  it('leaves the outcome on screen, whether it worked or not', () => {
    expect(bar({ note: { kind: 'trouble', text: 'Restart Zetrem' } })).toContain('Restart Zetrem')
    expect(bar({ note: { kind: 'created', name: 'Nova' } })).toContain('Nova is ready')
  })

  it('offers the restart button while a session runs, instead of only mentioning it', () => {
    const live = bar({ note: { kind: 'created', name: 'Nova' }, sessionLive: true })
    expect(live).toContain('Restart session')
    expect(bar({ note: { kind: 'created', name: 'Nova' }, sessionLive: false })).not.toContain(
      'Restart session',
    )
  })

  it('locks hiring without a project and says why', () => {
    const html = bar({ canWrite: false })
    const button = html.slice(html.lastIndexOf('<button', html.indexOf('>Add teammate<')))
    expect(button).toContain('disabled=""')
    expect(button).toContain('Pick a project first')
  })

  function memberRow(html: string): string {
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    return html.slice(at, html.indexOf('>', html.indexOf('data-member=')))
  }

  it('dims nobody before a session exists, since unknown is not no', () => {
    expect(memberRow(bar())).toContain('text-foreground')
    expect(memberRow(bar({ sessionKnown: true }))).toContain('text-muted-foreground')
  })

  it('keeps someone the session knows at full strength', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })
    expect(memberRow(html)).toContain('text-foreground')
  })
})

describe('a name on the roster is something you can press', () => {
  it('opens the report when you press someone who is working', () => {
    const html = bar({ members: [member({ state: 'working', sessionId: 's1' })] })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('See what they did')
    expect(button).not.toContain('disabled="')
  })

  it('addresses the next task to someone who is idle', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('Give them a task')
  })

  it('cannot press someone this session does not know, since calling would not reach them', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: false })] })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('disabled=""')
    expect(button).toContain('next session')
  })
})

describe('someone you hired can be let go', () => {
  it('gives each row a menu named after that person', () => {
    const html = bar({ members: [member({ name: 'code-reviewer' })] })
    expect(html).toContain('More for code-reviewer')
  })

  it('keeps the menu out of sight until wanted, so it is not pressed by accident', () => {
    const html = bar()
    const at = html.indexOf('More for')
    const button = html.slice(html.lastIndexOf('<button', at), at)
    expect(button).toContain('opacity-0')
  })
})

describe('someone you hired can be edited', () => {
  it('puts edit and remove in the same menu', () => {
    const html = bar({ members: [member({ name: 'code-reviewer' })] })
    expect(html).toContain('More for code-reviewer')
  })

  it('opens the editor already filled with what that person is', () => {
    const draft = {
      name: 'code-reviewer',
      description: 'Looks at what changed',
      model: 'sonnet',
      character: 'ghost',
      tools: [],
      knowledge: [],
      prompt: 'What, and how',
    }
    const html = renderToStaticMarkup(
      <TeamSidebar
        members={[member({ name: 'code-reviewer' })]}
        sessionKnown={false}
        canWrite
        note={null}
        knownTools={[]}
        status={IDLE}
        sessionLive={false}
        onRestart={() => {}}
        stock={[]}
      stockOn={[]}
      onStock={() => {}}
      chats={[]}
      openChatId={null}
      nowMs={0}
      onOpenChat={() => {}}
      onStartChat={() => {}}
      onRemoveChat={() => {}}
      width={SIDEBAR.width}
        onResize={() => {}}
        onResizeEnd={() => {}}
        onHire={() => {}}
        onPick={() => {}}
        onAddress={() => {}}
        onRelease={() => {}}
        onEdit={() => {}}
        drafts={new Map([['code-reviewer', draft]])}
      />,
    )
    expect(html).toContain('More for code-reviewer')
  })
})

describe('a locked session says so', () => {
  it('leaves someone uncallable unpressable, with the reason attached', () => {
    const html = bar({
      sessionKnown: true,
      members: [member({ loaded: true, callable: false })],
    })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('disabled=""')
    expect(button).toContain('Not available this session')
  })
})

describe('the sidebar foot says what has been spent', () => {
  it('says why it is empty rather than vanishing, so the panel can be found', () => {
    const html = bar()
    expect(html).toContain('data-usage')
    expect(html).toContain('once a chat is under way')
  })

  it('shows the weekly account limit as a share used', () => {
    const html = bar({
      status: {
        ...IDLE,
        limits: [
          {
            kind: 'seven_day',
            utilization: 0.5,
            resetsAtMs: 1787173200000,
            overage: false,
            status: 'allowed',
          },
        ],
      },
    })
    expect(html).toContain('data-usage')
    expect(html).toContain('Weekly')
    expect(html).toContain('50%')
  })

  it('shows how much of the context window this chat holds', () => {
    const html = bar({ status: { ...IDLE, context: { used: 40_000, window: 200_000 } } })
    expect(html).toContain('This chat')
    expect(html).toContain('20%')
  })

  it('marks a limit that needs attention by weight and not by colour', () => {
    const html = bar({
      status: {
        ...IDLE,
        limits: [
          {
            kind: 'five_hour',
            utilization: 0.95,
            resetsAtMs: 1787173200000,
            overage: false,
            status: 'allowed_warning',
          },
        ],
      },
    })
    expect(html).toContain('5-hour')
    expect(html).not.toMatch(/text-(red|amber|yellow|orange)-/)
  })
})

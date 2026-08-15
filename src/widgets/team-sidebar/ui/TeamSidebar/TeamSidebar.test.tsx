import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamSidebar } from './TeamSidebar'
import type { StatusState } from '@/entities/agent-session'
import { SIDEBAR } from '@/shared/config/theme'

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
      chats={{
        chats: [],
        openId: null,
        onOpen: () => {},
        onStart: () => {},
        onRemove: () => {},
      }}
      team={{
        members: [],
        drafts: new Map(),
        knownTools: [],
        sessionKnown: false,
        sessionLive: false,
        canWrite: true,
        note: null,
        onHire: () => {},
        onEdit: () => {},
        onRelease: () => {},
        onPick: () => {},
        onAddress: () => {},
        onRestart: () => {},
      }}
      stock={{ stock: [], on: [], onChange: () => {} }}
      status={IDLE}
      nowMs={0}
      width={SIDEBAR.width}
      onResize={() => {}}
      onResizeEnd={() => {}}
      {...props}
    />,
  )
}

describe('TeamSidebar: the column that stacks the sections in order', () => {
  it('names each section, so the column reads as parts and not one list', () => {
    const html = bar()
    expect(html.indexOf('Your team')).toBeGreaterThan(-1)
    expect(html.indexOf('Claude Code')).toBeGreaterThan(html.indexOf('Your team'))
    expect(html.indexOf('Usage')).toBeGreaterThan(html.indexOf('Claude Code'))
  })

  it('holds the width it was given, since the drag is owned above it', () => {
    expect(bar({ width: 321 })).toContain('width:321px')
  })

  it('hands the team its own section rather than laying the roster out itself', () => {
    expect(bar({ team: { ...teamOf(), members: [], note: null } })).toContain('No one here yet')
  })

  it('passes the live session through to the usage panel, which counts on it', () => {
    expect(bar()).toContain('Usage shows up once a chat is under way')
  })
})

function teamOf() {
  return {
    members: [],
    drafts: new Map(),
    knownTools: [],
    sessionKnown: false,
    sessionLive: false,
    canWrite: true,
    note: null,
    onHire: () => {},
    onEdit: () => {},
    onRelease: () => {},
    onPick: () => {},
    onAddress: () => {},
    onRestart: () => {},
  }
}

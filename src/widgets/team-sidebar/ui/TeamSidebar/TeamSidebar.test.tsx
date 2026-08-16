import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamSidebar } from './TeamSidebar'
import { SIDEBAR } from '@/shared/config/theme'

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
        read: [],
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
  })

  it('carries no usage, which belongs to the account and not to this column', () => {
    expect(bar()).not.toContain('data-usage')
  })

  it('holds the width it was given, since the drag is owned above it', () => {
    expect(bar({ width: 321 })).toContain('width:321px')
  })

  it('hands the team its own section rather than laying the roster out itself', () => {
    expect(bar({ team: { ...teamOf(), members: [], note: null } })).toContain('No one here yet')
  })

})

function teamOf() {
  return {
    members: [],
    drafts: new Map(),
    knownTools: [],
    sessionKnown: false,
        read: [],
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

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
    onRename: () => {},
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
        hint: false,
        onHintSeen: () => {},
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
    hint: false,
    onHintSeen: () => {},
    note: null,
    onHire: () => {},
    onEdit: () => {},
    onRelease: () => {},
    onPick: () => {},
    onAddress: () => {},
    onRestart: () => {},
  }
}

describe('the sidebar holds our own people and what Claude Code brings, and nothing else', () => {
  it('has a place for the team and a place for the builtins', () => {
    const html = bar({ stock: { stock: ['Explore'], on: [], onChange: () => {} } })
    expect(html).toContain('Your team')
    expect(html).toContain('Claude Code')
    expect(html).toContain('Explore')
  })

  it('names no other source, since agents from elsewhere do not belong here', () => {
    const html = bar({ stock: { stock: ['Explore'], on: [], onChange: () => {} } })
    expect(html).not.toContain('.claude/agents')
  })

  it('says it is still reading while Claude Code has named nobody', () => {
    expect(bar()).toContain('Reading which agents Claude Code brings')
  })
})

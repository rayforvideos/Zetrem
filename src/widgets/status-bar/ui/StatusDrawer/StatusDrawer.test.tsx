import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { StatusDrawer } from './StatusDrawer'

const full: StatusState = {
  usage: 'read',
  usageAtMs: null,
  probed: false,
  session: {
    id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
    cwd: '/Users/sam/workspace/zetrem',
    model: 'claude-opus-5[1m]',
    permissionMode: 'bypassPermissions',
    cliVersion: '2.1.231',
    mcp: [
      { name: 'playwright', status: 'connected' },
      { name: 'claude.ai Notion', status: 'needs-auth' },
    ],
    tools: [],
    agents: [],
  },
  context: { used: 100_000, window: 1_000_000 },
  cost: { usd: 0.19, lastTurnUsd: 0.04, tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 }, durationMs: 10485, turns: 3 },
  limits: [],
  update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
  activity: 'idle',
}

function draw(state: StatusState = full, props: Partial<Parameters<typeof StatusDrawer>[0]> = {}) {
  return renderToStaticMarkup(
    <StatusDrawer
      appVersion={null}
      connectors={[]}
      checking={false}
      onRecheck={() => {}}
      statusState={state}
      onUpdate={() => {}}
      updating={false}
      {...props}
    />,
  )
}

describe('StatusDrawer says where you are and what it costs', () => {
  it('names the folder and the model, the two things nothing else on screen says', () => {
    const html = draw()
    expect(html).toContain('/Users/sam/workspace/zetrem')
    expect(html).toContain('claude-opus-5[1m]')
  })

  it('gives context as plain numbers, since the bar hides them on a narrow window', () => {
    const html = draw()
    expect(html).toContain('100,000')
    expect(html).toContain('1,000,000')
  })

  it('puts no price on the session, which reports usage and not money', () => {
    expect(draw()).not.toContain('$')
  })

  it('drops the numbers nobody acts on', () => {
    const html = draw()
    expect(html, 'four kinds of token, broken out').not.toContain('76,424')
    expect(html, 'turns').not.toContain('Turns')
    expect(html, 'duration').not.toContain('10.5s')
    expect(html, 'session id').not.toContain('f77f771b')
  })

  it('shows nothing for context and cost before a turn has run', () => {
    const fresh: StatusState = { ...full, context: { used: 0, window: 1_000_000 }, cost: { ...full.cost, usd: 0 } }
    const html = draw(fresh)
    expect(html).not.toContain('Context')
    expect(html).not.toContain('Cost')
    expect(html, 'the place stays where it was').toContain('claude-opus-5[1m]')
  })
})

describe('permission mode speaks only when it is not the ordinary one', () => {
  it('names a mode that lets the agent act without asking', () => {
    expect(draw()).toContain('bypassPermissions')
  })

  it('stays quiet on the default, which is what the reader already assumes', () => {
    const ordinary: StatusState = { ...full, session: { ...full.session!, permissionMode: 'default' } }
    expect(draw(ordinary)).not.toContain('Permission')
  })

  it('stays quiet when the CLI named no mode at all', () => {
    const unsaid: StatusState = { ...full, session: { ...full.session!, permissionMode: '' } }
    expect(draw(unsaid)).not.toContain('Permission')
  })
})

describe('the connector list answers which one is broken, not which ones are fine', () => {
  it('raises the one needing sign-in and leaves the healthy one off the list', () => {
    const html = draw()
    expect(html, 'the heading knows the prefix already, so only the name shows').toContain('>Notion<')
    expect(html).not.toContain('claude.ai Notion')
    expect(html).toContain('Needs auth')
    expect(html, 'what is fine takes up no line').not.toContain('>playwright<')
  })

  it('counts the rest in one line rather than listing them', () => {
    expect(draw()).toContain('1 of 2 connected')
  })

  it('says only the count when every connector is reachable', () => {
    const calm: StatusState = {
      ...full,
      session: { ...full.session!, mcp: [{ name: 'playwright', status: 'connected' }] },
    }
    const html = draw(calm)
    expect(html).toContain('All 1 connected')
    expect(html).not.toContain('Needs auth')
  })

  it('clears a connector the health check found alive, however the startup snapshot saw it', () => {
    const html = draw(full, {
      connectors: [{ name: 'claude.ai Notion', where: 'https://mcp.notion.com/mcp', state: 'connected' }],
    })
    expect(html, 'Recheck has to be able to fix something').not.toContain('Needs auth')
    expect(html).toContain('All 2 connected')
  })

  it('offers a way to ask again, since signing in happens outside the app', () => {
    expect(draw()).toContain('Recheck')
  })

  it('makes no claim at all until the health check has come back', () => {
    const html = draw(full, { checked: false })
    expect(html).toContain('Checking…')
    expect(html, 'it does not claim to know what it does not know yet').not.toContain('Needs auth')
    expect(html).not.toContain('connected')
  })

  it('keeps the Recheck button reachable while it is still checking', () => {
    expect(draw(full, { checked: false })).toContain('Connectors')
  })

  it('leaves the group out when it knows of no connector at all', () => {
    const none: StatusState = { ...full, session: { ...full.session!, mcp: [] } }
    expect(draw(none)).not.toContain('Connectors')
  })
})

describe('the version line carries the update, and nothing else', () => {
  it('names both versions once it knows them', () => {
    const html = draw(full, { appVersion: '1.0.0-beta.1' })
    expect(html).toContain('1.0.0-beta.1')
    expect(html).toContain('2.1.231')
  })

  it('says nothing about updating while the version in hand is the latest', () => {
    const html = draw()
    expect(html).not.toContain('update available')
    expect(html).not.toContain('brew upgrade')
  })

  it('hands a Homebrew install its own command rather than a button that will not do it', () => {
    const stale: StatusState = { ...full, update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = draw(stale)
    expect(html).toContain('2.1.240')
    expect(html).toContain('brew upgrade claude-code@latest')
    expect(html).not.toContain('>Update<')
  })

  it('keeps the button for an install nothing else owns', () => {
    const stale: StatusState = { ...full, update: { current: '2.1.231', latest: '2.1.240', managedBy: null } }
    const html = draw(stale)
    expect(html).toContain('>Update<')
    expect(html).not.toContain('brew upgrade')
  })

  it('offers no update when the local build is newer, comparing numbers and not strings', () => {
    const newerLocal: StatusState = { ...full, update: { current: '2.2.0', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = draw(newerLocal)
    expect(html).not.toContain('>Update<')
    expect(html).not.toContain('brew upgrade')
  })

  it('leaves the line out when it knows neither version', () => {
    const html = draw({ ...full, update: null })
    expect(html).not.toContain('CLI')
  })
})

describe('the drawer stays inside the room it was given', () => {
  it('leaves the conversation most of the window, however much it has to say', () => {
    expect(draw()).toContain('max-h-[min(58vh,560px)]')
  })

  it('scrolls its own body rather than growing past what it was given', () => {
    expect(draw()).toContain('overflow-y-auto')
  })

  it('draws nothing it was told nothing about', () => {
    const bare: StatusState = { ...full, session: null, update: null }
    const html = draw(bare)
    expect(html).not.toContain('claude-opus-5')
    expect(html).not.toContain('Connectors')
  })
})

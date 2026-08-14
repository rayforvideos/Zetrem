import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { StatusDrawer } from './StatusDrawer'

const full: StatusState = {
  session: {
    id: 'f77f771b-4d45-4551-b887-202b62a6edc5',
    cwd: '/Users/sam/workspace/zetrem',
    model: 'claude-opus-5[1m]',
    permissionMode: 'acceptEdits',
    outputStyle: 'default',
    cliVersion: '2.1.231',
    apiKeySource: 'none',
    fastMode: { state: 'off', reason: 'sdk_opt_in_required' },
    mcp: [
      { name: 'playwright', status: 'connected' },
      { name: 'claude.ai Notion', status: 'needs-auth' },
    ],
    tools: [],
    agents: [],
    counts: { tools: 62, commands: 65, agents: 12, skills: 20, plugins: 3 },
    memoryPaths: ['/Users/sam/.claude/projects/x/memory/'],
  },
  context: { used: 100_000, window: 1_000_000 },
  cost: { usd: 0.19, lastTurnUsd: 0.04, tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 }, durationMs: 10485, ttftMs: 2352, turns: 3 },
  limits: [],
  hooks: [{ name: 'SessionStart:startup', event: 'SessionStart', exitCode: 0, ms: 12 }],
  update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
  activity: 'idle',
}

describe('StatusDrawer', () => {
  it('says everything about who this session is', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('f77f771b')
    expect(html).toContain('/Users/sam/workspace/zetrem')
    expect(html).toContain('claude-opus-5[1m]')
    expect(html).toContain('sdk_opt_in_required')
  })

  it('breaks out the four token kinds beside context and cost', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('76,424')
    expect(html).toContain('14,862')
    expect(html).toContain('261')
    expect(html).toContain('100,000')
  })

  it('lists every MCP server and marks the ones needing sign-in', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('playwright')
    expect(html).toContain('claude.ai Notion')
    expect(html).toContain('Needs auth')
  })

  it('says the version and who manages it', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('2.1.231')
    expect(html).toContain('Homebrew')
    expect(html).toContain('SessionStart:startup')
  })

  it('offers the update button only when there is a newer version', () => {
    const calm = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(calm).not.toContain('Update')

    const stale = { ...full, update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = renderToStaticMarkup(<StatusDrawer statusState={stale} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('Update')
  })

  it('offers no update when the local build is newer, comparing numbers and not strings', () => {
    const newerLocal = { ...full, update: { current: '2.2.0', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = renderToStaticMarkup(<StatusDrawer statusState={newerLocal} onUpdate={() => {}} updating={false} />)
    expect(html).not.toContain('Update')
    expect(html).not.toContain('새 버전')
  })

  it('leaves out a group it knows nothing about', () => {
    const bare: StatusState = { ...full, session: null, hooks: [], update: null }
    const html = renderToStaticMarkup(<StatusDrawer statusState={bare} onUpdate={() => {}} updating={false} />)
    expect(html).not.toContain('claude-opus-5')
    expect(html).not.toContain('SessionStart')
  })

  it('leaves out the environment group when it has nothing to put in it', () => {
    const noEnvironment: StatusState = {
      ...full,
      session: { ...full.session!, memoryPaths: [] },
      hooks: [],
      update: null,
    }
    const html = renderToStaticMarkup(
      <StatusDrawer statusState={noEnvironment} onUpdate={() => {}} updating={false} />,
    )
    expect(html).not.toContain('Homebrew')
    expect(html).not.toContain('SessionStart')
    expect(html.match(/data-slot="separator"/g)?.length ?? 0).toBe(2)
  })

  it('leaves out a row the CLI gave no value for', () => {
    const emptyFields: StatusState = {
      ...full,
      session: { ...full.session!, id: '', cwd: '', permissionMode: '', outputStyle: '', apiKeySource: '' },
    }
    const html = renderToStaticMarkup(
      <StatusDrawer statusState={emptyFields} onUpdate={() => {}} updating={false} />,
    )
    expect(html).not.toContain('자리')
    expect(html).not.toContain('권한 모드')
    expect(html).not.toContain('출력 스타일')
    expect(html).not.toContain('API 키')
    expect(html).toContain('claude-opus-5[1m]')
  })

  it('keeps the drawer under two fifths of the height, so it does not take the conversation room', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('40vh')
  })

  it('caps by absolute height as well, for a board shorter than the viewport', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('min(40vh,340px)')
  })
})

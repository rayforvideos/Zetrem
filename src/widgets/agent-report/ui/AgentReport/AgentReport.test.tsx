import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession, Call } from '@/entities/agent-session'
import { AgentReport } from './AgentReport'

function call(id: string, line: string): Call {
  return { id, line, startedAtMs: 0, endedAtMs: 200, failed: false, note: '' }
}

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'claude',
    label: 'Subagent',
    subagentType: 'code-reviewer',
    model: 'sonnet',
    status: 'done',
    headline: '두 자리를 고쳤습니다',
    stream: [call('c1', 'Read a.ts'), call('c2', 'Edit a.ts'), call('c3', 'Bash npm test')],
    transcript: [
      { role: 'user', text: '리뷰해줘' },
      { role: 'assistant', text: '고칠 곳 두 군데를 찾았습니다' },
    ],
    tokens: 900,
    contextUsed: 0.2,
    startedAtMs: 1000,
    endedAtMs: 31000,
    ...overrides,
  }
}

function report(overrides: Partial<AgentSession> = {}): string {
  return renderToStaticMarkup(
    <AgentReport
      session={session(overrides)}
      sessions={[session(overrides)]}
      nowMs={61000}
      onClose={() => {}}
      onPick={() => {}}
    />,
  )
}

describe('AgentReport: what has come of it so far', () => {
  it('leads with who did what, and how much', () => {
    const html = report()
    expect(html).toContain('Code Reviewer')
    expect(html).toContain('두 자리를 고쳤습니다')
    expect(html).toContain('Done')
    expect(html).toContain('30s')
  })

  it('counts the time so far for someone still running', () => {
    expect(report({ status: 'working', endedAtMs: undefined })).toContain('60s')
  })

  it('counts the work by kind and leaves out a kind with none', () => {
    const html = report()
    expect(html).toContain('Read')
    expect(html).toContain('Edited')
    expect(html).toContain('Ran')
    expect(html).not.toContain('Searched')
  })

  it('leaves a line for each thing done', () => {
    expect(report()).toContain('Edit a.ts')
  })

  it('carries the words that passed, when there were any', () => {
    expect(report()).toContain('고칠 곳 두 군데를 찾았습니다')
  })

  it('says so when nothing was done, rather than showing an empty board', () => {
    expect(report({ stream: [], transcript: [] })).toContain('Nothing yet')
  })
})

describe('AgentReport: the work a fenced-off teammate left behind', () => {
  it('offers to show it and to take it back, once the branch it is on is known', () => {
    const html = report({ agentId: 'a879059595fc11096' })
    expect(html).toContain('data-worktree-review')
    expect(html).toContain('Diff')
    expect(html).toContain('Roll back')
  })

  it('offers neither for a teammate that wrote in the tree everyone shares', () => {
    const html = report()
    expect(html).not.toContain('data-worktree-review')
    expect(html).not.toContain('Roll back')
  })

  it('asks before taking anything back, so nothing is undone on one press', () => {
    expect(report({ agentId: 'a879059595fc11096' })).not.toContain('data-worktree-confirm')
  })
})

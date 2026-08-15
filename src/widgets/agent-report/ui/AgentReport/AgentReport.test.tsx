import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { AgentReport } from './AgentReport'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'claude',
    label: 'Subagent',
    subagentType: 'code-reviewer',
    model: 'sonnet',
    status: 'done',
    headline: '두 자리를 고쳤습니다',
    stream: ['Read a.ts', 'Edit a.ts', 'Bash npm test'],
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
    <AgentReport session={session(overrides)} nowMs={61000} onClose={() => {}} />,
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

  it('says where the work was left when there is an outcome', () => {
    const html = report({ outcome: { branch: 'feat/x', commits: 2, dirtyFiles: 1 } })
    expect(html).toContain('Left 2 commits and 1 file not committed on feat/x')
  })
})

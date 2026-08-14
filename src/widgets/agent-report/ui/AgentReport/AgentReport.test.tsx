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

describe('AgentReport — 여태 무엇이 되었나', () => {
  it('누가 무엇을 얼마나 했는지 먼저 말한다', () => {
    const html = report()
    expect(html).toContain('Code Reviewer')
    expect(html).toContain('두 자리를 고쳤습니다')
    expect(html).toContain('Done')
    expect(html).toContain('30s')
  })

  it('아직 도는 사람은 지금까지의 시간을 센다', () => {
    expect(report({ status: 'working', endedAtMs: undefined })).toContain('60s')
  })

  it('한 일을 종류별로 세고, 없는 종류는 그리지 않는다', () => {
    const html = report()
    expect(html).toContain('Read')
    expect(html).toContain('Edited')
    expect(html).toContain('Ran')
    expect(html).not.toContain('Searched')
  })

  it('무엇을 했는지 한 줄씩 남긴다', () => {
    expect(report()).toContain('Edit a.ts')
  })

  it('주고받은 말이 있으면 싣는다', () => {
    expect(report()).toContain('고칠 곳 두 군데를 찾았습니다')
  })

  it('한 일이 없으면 없다고 말한다 — 빈 판을 보여주지 않는다', () => {
    expect(report({ stream: [], transcript: [] })).toContain('Nothing yet')
  })

  it('작업 결과가 있으면 어디에 남았는지 말한다', () => {
    const html = report({ outcome: { branch: 'feat/x', commits: 2, dirtyFiles: 1 } })
    expect(html).toContain('feat/x')
    expect(html).toContain('commits 2')
  })
})

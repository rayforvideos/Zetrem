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
  limit: null,
  hooks: [{ name: 'SessionStart:startup', event: 'SessionStart', exitCode: 0, ms: 12 }],
  update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
  activity: 'idle',
}

describe('StatusDrawer', () => {
  it('세션 묶음이 신원을 전부 말한다', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('f77f771b')
    expect(html).toContain('/Users/sam/workspace/zetrem')
    expect(html).toContain('claude-opus-5[1m]')
    expect(html).toContain('sdk_opt_in_required')
  })

  it('계기 묶음이 토큰 네 종류와 컨텍스트·비용을 나눠 보인다', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('76,424')
    expect(html).toContain('14,862')
    expect(html).toContain('261')
    expect(html).toContain('100,000')
  })

  it('MCP 는 전부 줄로 서고 인증이 필요한 것이 드러난다', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('playwright')
    expect(html).toContain('claude.ai Notion')
    expect(html).toContain('인증 필요')
  })

  it('환경 묶음이 버전과 관리 주체를 말한다', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('2.1.231')
    expect(html).toContain('Homebrew')
    expect(html).toContain('SessionStart:startup')
  })

  it('새 버전이 있을 때만 갱신 버튼이 선다', () => {
    const calm = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(calm).not.toContain('갱신하기')

    const stale = { ...full, update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = renderToStaticMarkup(<StatusDrawer statusState={stale} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('갱신하기')
  })

  it('로컬 빌드가 latest 보다 새 버전이면 갱신 버튼을 세우지 않는다 — 문자열(!==) 이 아니라 isOutdated 의 숫자 비교로 판단한다', () => {
    const newerLocal = { ...full, update: { current: '2.2.0', latest: '2.1.240', managedBy: 'Homebrew' } }
    const html = renderToStaticMarkup(<StatusDrawer statusState={newerLocal} onUpdate={() => {}} updating={false} />)
    expect(html).not.toContain('갱신하기')
    expect(html).not.toContain('새 버전')
  })

  it('아직 세션이 없으면 모르는 묶음은 그리지 않는다', () => {
    const bare: StatusState = { ...full, session: null, hooks: [], update: null }
    const html = renderToStaticMarkup(<StatusDrawer statusState={bare} onUpdate={() => {}} updating={false} />)
    expect(html).not.toContain('claude-opus-5')
    expect(html).not.toContain('SessionStart')
  })

  it('세션이 있어도 환경 묶음의 재료(갱신·훅·기억)가 하나도 없으면 그 묶음은 그리지 않는다', () => {
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

  it('세션 필드가 빈 문자열이면(CLI 의 init 이 값을 안 준 경우) 그 행을 그리지 않는다', () => {
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

  it('서랍은 40vh 를 넘지 않는다 — 대화의 자리를 빼앗지 않게', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('40vh')
  })

  it('뷰포트보다 짧은 판에서도 절대 높이로 한 번 더 천장을 건다', () => {
    const html = renderToStaticMarkup(<StatusDrawer statusState={full} onUpdate={() => {}} updating={false} />)
    expect(html).toContain('min(40vh,340px)')
  })
})

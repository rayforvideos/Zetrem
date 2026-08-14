import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SetupPane } from './SetupPane'

function pane(props: Partial<Parameters<typeof SetupPane>[0]> = {}): string {
  return renderToStaticMarkup(
    <SetupPane
      auth={null}
      project={null}
      permissionMode="ask"
      model="default"
      onLogin={() => {}}
      onPickProject={() => {}}
      onPermissionMode={() => {}}
      onModel={() => {}}
      onlyOurAgents
      onOnlyOurAgents={() => {}}
      ourAgentCount={0}
      onStart={() => {}}
      canStart={false}
      loggingIn={false}
      loginNote=""
      onLogout={() => {}}
      loggingOut={false}
      sessionLive={false}
      authError={null}
      {...props}
    />,
  )
}

describe('SetupPane — 시작하기 전에 정할 것이 한 화면에 선다', () => {
  it('정해야 할 것 넷을 모두 세운다', () => {
    const html = pane()
    for (const label of ['Account', 'Project', 'Permissions', 'Model', 'Who can be called']) {
      expect(html, `${label} 이 없다`).toContain(label)
    }
  })

  it('계정과 프로젝트가 없으면 시작이 잠기고 이유를 단다', () => {
    const html = pane()
    expect(html).toContain('Set your account and project first')
    const start = html.slice(html.lastIndexOf('<button', html.indexOf('>Start<')))
    expect(start).toContain('disabled=""')
  })

  it('둘 다 정해지면 시작이 열린다 — 위 단언이 늘 참이 되지 않게 반대편도 건다', () => {
    const html = pane({
      canStart: true,
      auth: { loggedIn: true, email: 'sam@example.com', missing: false },
      project: { name: 'zetrem', path: '/tmp/zetrem' },
    })
    const start = html.slice(html.lastIndexOf('<button', html.indexOf('>Start<')))
    expect(start).not.toContain('disabled=""')
    expect(html).not.toContain('Set your account and project first')
  })

  it('들어와 있으면 나갈 길도 같이 선다 — 계정을 바꿀 수 없으면 갇힌 것이다', () => {
    const html = pane({
      auth: { loggedIn: true, email: 'sam@example.com', missing: false },
    })
    expect(html).toContain('sam@example.com')
    expect(html).toContain('Sign out')
  })

  it('세션이 도는 중이면 나가면 끊긴다고 먼저 말한다', () => {
    const live = pane({
      auth: { loggedIn: true, email: 'sam@example.com', missing: false },
      sessionLive: true,
    })
    expect(live).toContain('stops the running session')
    const idle = pane({ auth: { loggedIn: true, email: 'sam@example.com', missing: false } })
    expect(idle).not.toContain('stops the running session')
  })

  it('나가려다 실패하면 그 사실이 화면에 남는다 — 조용히 로그인된 척하지 않는다', () => {
    const html = pane({
      auth: { loggedIn: true, email: 'sam@example.com', missing: false },
      authError: 'claude: command not found',
    })
    expect(html).toContain('claude: command not found')
    expect(html).not.toContain('Sign out to use a different')
  })

  it('claude 를 못 찾으면 로그인 대신 그 사실을 말한다', () => {
    const html = pane({ auth: { loggedIn: false, missing: true } })
    expect(html).toContain('command not found')
    expect(html).not.toContain('Anthropic 계정으로 로그인')
  })

  it('들인 사람이 없으면 잠금 스위치가 잠긴다 — 잠글 대상이 없다', () => {
    expect(pane({ ourAgentCount: 0 })).toContain('No teammates yet, so nothing is locked')
    expect(pane({ ourAgentCount: 3 })).toContain('Only the 3 teammates created in Zetrem')
  })

  it('고르는 알약은 제 내용만큼만 넓다 — Field 가 자식을 늘리는 것에 끌려가지 않는다', () => {
    const html = pane()
    const groups = [...html.matchAll(/<div[^>]*data-slot="toggle-group"[^>]*class="([^"]*)"/g)].map(
      (match) => match[1] as string,
    )
    expect(groups, '권한과 모델 두 벌이 선다').toHaveLength(2)
    for (const cls of groups) {
      expect(cls, '내용만큼만 넓어야 한다').toContain('w-fit')
      expect(cls, '칸 전체로 늘어나면 알약 안에 빈 꼬리가 남는다').not.toContain('w-full')
    }
  })

  it('고른 것의 뜻을 밑에 적는다 — 이름만으로는 무엇이 달라지는지 모른다', () => {
    expect(pane({ permissionMode: 'bypass' })).toContain('Never asks')
    expect(pane({ model: 'haiku' })).toContain('Fast and cheap')
  })
})

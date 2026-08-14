import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamSidebar } from './TeamSidebar'
import type { TeamMember } from '../lib/team'

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    type: 'code-reviewer',
    name: 'code-reviewer',
    description: '고친 자리를 본다',
    model: 'sonnet',
    origin: 'project',
    loaded: false,
    callable: false,
    state: 'idle',
    note: null,
    sessionId: null,
    ...overrides,
  }
}

function bar(props: Partial<Parameters<typeof TeamSidebar>[0]> = {}): string {
  return renderToStaticMarkup(
    <TeamSidebar
      members={[member()]}
      sessionKnown={false}
      canWrite
      note={null}
      onHire={() => {}}
      onPick={() => {}}
      onAddress={() => {}}
      {...props}
    />,
  )
}

describe('TeamSidebar — 눌렀는데 아무 일도 안 일어나면 안 된다', () => {
  it('들인 결과든 실패든 화면에 남는다', () => {
    expect(bar({ note: '앱을 다시 켜야 합니다' })).toContain('앱을 다시 켜야 합니다')
  })

  it('프로젝트가 없으면 들이기 자체가 잠기고 이유를 단다', () => {
    const html = bar({ canWrite: false })
    const button = html.slice(html.lastIndexOf('<button', html.indexOf('사람 새로 들이기')))
    expect(button).toContain('disabled=""')
    expect(button).toContain('프로젝트를 먼저 골라야 합니다')
  })

  it('세션이 아직 없으면 아무도 흐리지 않는다 — 모른다를 아니다로 읽지 않는다', () => {
    expect(bar()).toContain('opacity-70')
    expect(bar({ sessionKnown: true })).toContain('opacity-30')
  })

  it('세션이 아는 사람은 세션이 있어도 선명하다', () => {
    expect(bar({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })).toContain('opacity-70')
  })
})

describe('명단의 이름은 눌리는 자리다', () => {
  it('일하는 사람을 누르면 한 일을 본다', () => {
    const html = bar({ members: [member({ state: 'working', sessionId: 's1' })] })
    const button = html.slice(html.indexOf('<button'), html.indexOf('</button>'))
    expect(button).toContain('한 일을 봅니다')
    expect(button).not.toContain('disabled="')
  })

  it('놀고 있는 사람을 누르면 그 사람에게 맡긴다', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })
    const button = html.slice(html.indexOf('<button'), html.indexOf('</button>'))
    expect(button).toContain('이 사람에게 맡깁니다')
  })

  it('이번 세션이 모르는 사람은 누를 수 없다 — 불러도 오지 않는다', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: false })] })
    const button = html.slice(html.indexOf('<button'), html.indexOf('</button>'))
    expect(button).toContain('disabled=""')
    expect(button).toContain('다음 세션부터')
  })
})

describe('잠긴 세션은 그렇게 말한다', () => {
  it('부를 수 없는 사람은 눌리지 않고 이유가 붙는다', () => {
    const html = bar({
      sessionKnown: true,
      members: [member({ loaded: true, callable: false })],
    })
    const button = html.slice(html.indexOf('<button'), html.indexOf('</button>'))
    expect(button).toContain('disabled=""')
    expect(button).toContain('부를 수 없습니다')
  })
})

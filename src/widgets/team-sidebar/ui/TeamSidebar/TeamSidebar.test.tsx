import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TeamSidebar } from './TeamSidebar'
import type { TeamMember } from '../../lib/team/team.types'
import { SIDEBAR } from '@/shared/config/theme'

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    type: 'code-reviewer',
    name: 'code-reviewer',
    description: '고친 자리를 본다',
    model: 'sonnet',
    character: null,
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
      stock={[]}
      stockOn={[]}
      onStock={() => {}}
      chats={[]}
      openChatId={null}
      nowMs={0}
      onOpenChat={() => {}}
      onStartChat={() => {}}
      onRemoveChat={() => {}}
      width={SIDEBAR.width}
      onResize={() => {}}
      onResizeEnd={() => {}}
      onHire={() => {}}
      onPick={() => {}}
      onAddress={() => {}}
      onRelease={() => {}}
      onEdit={() => {}}
      drafts={new Map()}
      {...props}
    />,
  )
}

describe('TeamSidebar — 눌렀는데 아무 일도 안 일어나면 안 된다', () => {
  it('들인 결과든 실패든 화면에 남는다', () => {
    expect(bar({ note: 'Restart Zetrem' })).toContain('Restart Zetrem')
  })

  it('프로젝트가 없으면 들이기 자체가 잠기고 이유를 단다', () => {
    const html = bar({ canWrite: false })
    const button = html.slice(html.lastIndexOf('<button', html.indexOf('>Add teammate<')))
    expect(button).toContain('disabled=""')
    expect(button).toContain('Pick a project first')
  })

  function memberRow(html: string): string {
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    return html.slice(at, html.indexOf('>', html.indexOf('data-member=')))
  }

  it('세션이 아직 없으면 아무도 흐리지 않는다 — 모른다를 아니다로 읽지 않는다', () => {
    expect(memberRow(bar())).toContain('text-foreground')
    expect(memberRow(bar({ sessionKnown: true }))).toContain('text-muted-foreground')
  })

  it('세션이 아는 사람은 세션이 있어도 선명하다', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })
    expect(memberRow(html)).toContain('text-foreground')
  })
})

describe('명단의 이름은 눌리는 자리다', () => {
  it('일하는 사람을 누르면 한 일을 본다', () => {
    const html = bar({ members: [member({ state: 'working', sessionId: 's1' })] })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('See what they did')
    expect(button).not.toContain('disabled="')
  })

  it('놀고 있는 사람을 누르면 그 사람에게 맡긴다', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: true, callable: true })] })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('Give them a task')
  })

  it('이번 세션이 모르는 사람은 누를 수 없다 — 불러도 오지 않는다', () => {
    const html = bar({ sessionKnown: true, members: [member({ loaded: false })] })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('disabled=""')
    expect(button).toContain('next session')
  })
})

describe('들인 사람은 내보낼 수도 있다', () => {
  it('행마다 더보기가 서고 그 사람의 이름을 단다', () => {
    const html = bar({ members: [member({ name: 'code-reviewer' })] })
    expect(html).toContain('More for code-reviewer')
  })

  it('평소엔 보이지 않는다 — 실수로 누를 일이 없게', () => {
    const html = bar()
    const at = html.indexOf('More for')
    const button = html.slice(html.lastIndexOf('<button', at), at)
    expect(button).toContain('opacity-0')
  })
})

describe('들인 사람은 고칠 수도 있다', () => {
  it('더보기에 고치기와 내보내기가 함께 선다', () => {
    const html = bar({ members: [member({ name: 'code-reviewer' })] })
    expect(html).toContain('More for code-reviewer')
  })

  it('고치기를 열면 그 사람이 쓴 값이 이미 들어 있다', () => {
    const draft = {
      name: 'code-reviewer',
      description: '고친 자리를 본다',
      model: 'sonnet',
      character: 'ghost',
      tools: [],
      prompt: '무엇을 어떻게',
    }
    const html = renderToStaticMarkup(
      <TeamSidebar
        members={[member({ name: 'code-reviewer' })]}
        sessionKnown={false}
        canWrite
        note={null}
        stock={[]}
      stockOn={[]}
      onStock={() => {}}
      chats={[]}
      openChatId={null}
      nowMs={0}
      onOpenChat={() => {}}
      onStartChat={() => {}}
      onRemoveChat={() => {}}
      width={SIDEBAR.width}
        onResize={() => {}}
        onResizeEnd={() => {}}
        onHire={() => {}}
        onPick={() => {}}
        onAddress={() => {}}
        onRelease={() => {}}
        onEdit={() => {}}
        drafts={new Map([['code-reviewer', draft]])}
      />,
    )
    expect(html).toContain('More for code-reviewer')
  })
})

describe('잠긴 세션은 그렇게 말한다', () => {
  it('부를 수 없는 사람은 눌리지 않고 이유가 붙는다', () => {
    const html = bar({
      sessionKnown: true,
      members: [member({ loaded: true, callable: false })],
    })
    const at = html.lastIndexOf('<button', html.indexOf('data-member='))
    const button = html.slice(at, html.indexOf('</button>', at))
    expect(button).toContain('disabled=""')
    expect(button).toContain('Not available this session')
  })
})

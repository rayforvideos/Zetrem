import { describe, expect, it } from 'vitest'
import { MODELS, PERMISSION_MODES, agentArgs, isReady } from './run-config'

describe('agentArgs — 무엇을 들고 claude 를 띄우는가', () => {
  const base = {
    permissionMode: 'ask' as const,
    lock: null,
    people: [],
    model: 'default' as const,
    persona: '말투',
  }

  it('물어보기 모드는 권한 판단을 우리 창구로 위임한다', () => {
    const args = agentArgs(base)
    expect(args).toContain('--permission-prompt-tool')
    expect(args).toContain('stdio')
    expect(args).not.toContain('--permission-mode')
  })

  it('편집 자동승인은 CLI 의 모드로 넘긴다 — 우리가 흉내 내지 않는다', () => {
    const args = agentArgs({ ...base, permissionMode: 'acceptEdits' })
    expect(args).toContain('--permission-mode')
    expect(args).toContain('acceptEdits')
    expect(args).toContain('--permission-prompt-tool')
  })

  it('전부 허용은 위험한 선택이라 묻는 창구를 아예 떼어낸다 — 둘을 함께 주면 CLI 가 거부한다', () => {
    const args = agentArgs({ ...base, permissionMode: 'bypass' })
    expect(args).toContain('--dangerously-skip-permissions')
    expect(args).not.toContain('--permission-prompt-tool')
  })

  it('모델을 고르면 넘기고, 기본이면 CLI 의 선택을 존중한다', () => {
    expect(agentArgs({ ...base, model: 'haiku' })).toContain('haiku')
    expect(agentArgs(base)).not.toContain('--model')
  })

  it('말투는 언제나 얹는다 — 답의 첫 줄이 화면의 첫 줄이다', () => {
    const args = agentArgs(base)
    expect(args).toContain('--append-system-prompt')
    expect(args).toContain('말투')
  })

  it('부분 메시지를 켜지 않는다 — 말은 완성된 뒤에 선다', () => {
    const args = agentArgs({ permissionMode: 'ask' as const, lock: null, people: [], model: 'default', persona: '' })
    expect(args).not.toContain('--include-partial-messages')
  })

  it('고르는 것들은 전부 이름과 설명을 가진다 — 이름만으로는 무엇을 정하는지 모른다', () => {
    expect(PERMISSION_MODES).toHaveLength(3)
    for (const choice of [...PERMISSION_MODES, ...MODELS]) {
      expect(choice.label.length).toBeGreaterThan(0)
      expect(choice.hint.length, choice.label).toBeGreaterThan(0)
    }
  })
})

describe('isReady — 일을 맡길 수 있는 상태인가', () => {
  it('로그인과 프로젝트가 모두 있어야 한다', () => {
    expect(isReady({ loggedIn: true, project: '/p' })).toBe(true)
    expect(isReady({ loggedIn: false, project: '/p' })).toBe(false)
    expect(isReady({ loggedIn: true, project: null })).toBe(false)
  })
})

describe('잠금 — 우리가 들인 사람만 부르게 한다', () => {
  it('잠그면 오케스트레이터를 우리가 세우고 부를 사람을 좁힌다', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      persona: '말투',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: { knownTools: ['Read', 'Task'] },
    })
    expect(args).toContain('--agent')
    expect(args[args.indexOf('--agent') + 1]).toBe('zetrem')
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.zetrem.tools).toEqual(['Read', 'Agent(scout)'])
  })

  it('잠그지 않으면 CLI 의 기본 오케스트레이터를 건드리지 않는다', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      persona: '말투',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: null,
    })
    expect(args).toContain('--agents')
    expect(args).not.toContain('--agent')
  })
})

describe('잠긴 오케스트레이터의 프롬프트', () => {
  it('잠글 때는 말투가 아니라 오케스트레이터 프롬프트를 넣는다 — 말투만 주면 일을 못 한다', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      persona: '말투',
      orchestrator: '너는 오케스트레이터다',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: { knownTools: ['Read'] },
    })
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] as string)
    expect(spec.zetrem.prompt).toBe('너는 오케스트레이터다')
    expect(args).toContain('말투')
  })

  it('오케스트레이터 프롬프트가 없으면 말투로 대신한다 — 빈 프롬프트를 넘기면 CLI 가 정의를 통째로 무시한다', () => {
    const args = agentArgs({
      permissionMode: 'ask' as const,
      model: 'default' as const,
      persona: '말투',
      people: [{ name: 'scout', description: '찾는다', prompt: '찾아라', model: null }],
      lock: { knownTools: ['Read'] },
    })
    expect(JSON.parse(args[args.indexOf('--agents') + 1] as string).zetrem.prompt).toBe('말투')
  })
})

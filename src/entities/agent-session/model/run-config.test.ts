import { describe, expect, it } from 'vitest'
import { MODELS, PERMISSION_MODES, agentArgs, isReady } from './run-config'

describe('agentArgs — 무엇을 들고 claude 를 띄우는가', () => {
  const base = { permissionMode: 'ask' as const, model: 'default' as const, persona: '말투' }

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
    // 자동승인이어도 나머지 도구는 여전히 우리에게 묻는다
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

  it('부분 메시지를 켠다 — 글자가 흐르지 않으면 기다림이 정지처럼 보인다', () => {
    const args = agentArgs({ permissionMode: 'ask', model: 'default', persona: '' })
    expect(args).toContain('--include-partial-messages')
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

import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, readSettings } from './settings'

describe('readSettings — 저장된 선택을 되읽는다', () => {
  it('처음이면 기본값이고, 아직 시작을 누르지 않은 상태다', () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.setupDone).toBe(false)
    expect(DEFAULT_SETTINGS.permissionMode).toBe('ask')
  })

  it('저장된 값을 그대로 되살린다', () => {
    const saved = {
      permissionMode: 'bypass',
      model: 'haiku',
      setupDone: true,
      onlyOurAgents: false,
      knownTools: ['Read', 'Bash'],
      sidebarOpen: false,
    }
    expect(readSettings(saved)).toEqual(saved)
  })

  it('모르는 값은 기본으로 되돌린다 — 파일이 손상돼도 앱이 이상한 모드로 켜지지 않는다', () => {
    const restored = readSettings({ permissionMode: '전부열기', model: 'gpt', setupDone: 'yes' })
    expect(restored.permissionMode).toBe('ask')
    expect(restored.model).toBe('default')
    expect(restored.setupDone).toBe(false)
  })

  it('일부만 저장돼 있어도 나머지는 기본으로 채운다', () => {
    expect(readSettings({ model: 'opus' })).toEqual({ ...DEFAULT_SETTINGS, model: 'opus' })
  })
})

describe('잠금 설정', () => {
  it('아무것도 저장돼 있지 않으면 우리가 들인 사람만 쓰는 쪽이 기본이다', () => {
    expect(readSettings({}).onlyOurAgents).toBe(true)
  })

  it('꺼 둔 것은 꺼진 채로 되살린다', () => {
    expect(readSettings({ onlyOurAgents: false }).onlyOurAgents).toBe(false)
  })

  it('기억해 둔 도구 이름 중 글자가 아닌 것은 버린다', () => {
    expect(readSettings({ knownTools: ['Read', 3, null, 'Bash'] }).knownTools).toEqual([
      'Read',
      'Bash',
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { screenGate } from './screen-gate'

const known = {
  settingsLoaded: true,
  authKnown: true,
  projectKnown: true,
  loggedIn: true,
  hasProject: true,
  setupDone: true,
}

describe('screenGate — 모르는 동안은 어느 화면도 열지 않는다', () => {
  it('셋을 다 알고 갖춰졌으면 대화를 연다', () => {
    expect(screenGate(known)).toBe('conversation')
  })

  it('갖춰지지 않았으면 설정을 연다', () => {
    expect(screenGate({ ...known, setupDone: false })).toBe('setup')
    expect(screenGate({ ...known, loggedIn: false })).toBe('setup')
    expect(screenGate({ ...known, hasProject: false })).toBe('setup')
  })

  it('로그인 상태를 아직 모르면 설정을 열지 않는다 — 그게 새로고침 때의 깜빡임이었다', () => {
    expect(screenGate({ ...known, authKnown: false })).toBe('holding')
  })

  it('프로젝트를 아직 복원 중이면 설정을 열지 않는다', () => {
    expect(screenGate({ ...known, projectKnown: false, hasProject: false })).toBe('holding')
  })

  it('설정을 아직 읽는 중이면 아무 화면도 열지 않는다', () => {
    expect(screenGate({ ...known, settingsLoaded: false })).toBe('holding')
  })

  it('모름이 하나라도 있으면, 나머지가 갖춰졌든 아니든 기다린다', () => {
    expect(screenGate({ ...known, authKnown: false, setupDone: false })).toBe('holding')
  })

  it('알고 나면 아니라고 말한다 — 기다림이 영원해지지 않게', () => {
    expect(screenGate({ ...known, authKnown: true, loggedIn: false })).toBe('setup')
  })
})

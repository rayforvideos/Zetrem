import { describe, expect, it } from 'vitest'
import { trusted } from './ipc'

describe('IPC 는 우리 창에서 온 것만 받는다', () => {
  it('우리 창의 주 프레임이면 받는다', () => {
    expect(trusted({ hasWindow: true, isMainFrame: true })).toBe(true)
  })

  it('창에 속하지 않은 발신자는 막는다 — 떠도는 WebContents 가 파일을 쓰게 두지 않는다', () => {
    expect(trusted({ hasWindow: false, isMainFrame: true })).toBe(false)
  })

  it('주 프레임이 아니면 막는다 — 끼어든 iframe 이 프로세스를 띄우게 두지 않는다', () => {
    expect(trusted({ hasWindow: true, isMainFrame: false })).toBe(false)
  })

  it('둘 다 아니면 당연히 막는다', () => {
    expect(trusted({ hasWindow: false, isMainFrame: false })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { reasonOf } from './failure'

describe('실패의 이유는 사람이 읽을 수 있어야 한다', () => {
  it('Electron 이 붙이는 remote method 접두사를 걷는다', () => {
    const cause = new Error("Error invoking remote method 'auth:logout': claude: not found")
    expect(reasonOf(cause)).toBe('claude: not found')
  })

  it('Error 가 아닌 것도 말로 바꾼다 — 던져진 것이 무엇이든 화면에 설 수 있어야 한다', () => {
    expect(reasonOf('plain string')).toBe('plain string')
    expect(reasonOf(404)).toBe('404')
  })

  it('평범한 오류는 그대로 둔다', () => {
    expect(reasonOf(new Error('disk full'))).toBe('disk full')
  })
})

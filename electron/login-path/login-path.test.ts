import { delimiter } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canFind, commandNames, findCommand } from './login-path'

const windows = process.platform === 'win32'

describe('claude 를 찾는 규칙은 기계마다 다르다', () => {
  it('맥·리눅스에서는 이름 그대로 찾는다', () => {
    if (windows) return
    expect(commandNames('claude')).toEqual(['claude'])
  })

  it('PATH 는 그 기계의 구분자로 쪼갠다 — 맥은 :, 윈도우는 ;', () => {
    const dirs = ['/nowhere-a', '/nowhere-b'].join(delimiter)
    expect(findCommand('definitely-not-a-real-binary', dirs)).toBeNull()
    expect(canFind('definitely-not-a-real-binary', dirs)).toBe(false)
  })

  it('빈 칸은 건너뛴다 — PATH 끝의 구분자가 현재 폴더를 뒤지게 두지 않는다', () => {
    expect(findCommand('claude', delimiter + delimiter)).toBeNull()
  })

  it('찾으면 절대 경로를 준다 — 이름만 넘기면 윈도우가 못 띄운다', () => {
    const found = findCommand(windows ? 'cmd' : 'sh', process.env.PATH ?? '')
    expect(found, '이 기계에 기본 셸은 있어야 한다').not.toBeNull()
    expect(found).toContain(windows ? 'cmd' : 'sh')
    expect(found?.includes('/') || found?.includes('\\')).toBe(true)
  })
})

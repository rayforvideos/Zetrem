import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { changeCount } from './change-count'

function tool(line: string, input: unknown): ToolActivity {
  return { line, toolUseId: 't', input, result: null }
}

describe('열어보지 않아도 얼마나 바뀌는지 안다', () => {
  it('Edit 은 더한 줄과 뺀 줄을 센다', () => {
    const count = changeCount(tool('Edit a.ts', { old_string: 'a\nb', new_string: 'a\nc\nd' }))
    expect(count).toEqual({ added: 2, removed: 1 })
  })

  it('Write 는 쓴 줄만큼 더한 것이다 — 뺀 것은 없다', () => {
    expect(changeCount(tool('Write a.ts', { content: 'x\ny\nz' }))).toEqual({ added: 3, removed: 0 })
  })

  it('MultiEdit 은 여러 조각을 합쳐 센다', () => {
    const count = changeCount(
      tool('MultiEdit a.ts', {
        edits: [
          { old_string: 'a', new_string: 'b' },
          { old_string: 'c\nd', new_string: 'c' },
        ],
      }),
    )
    expect(count).toEqual({ added: 1, removed: 2 })
  })

  it('바뀐 것이 없으면 세지 않는다 — 0 을 그리면 화면이 거짓말한다', () => {
    expect(changeCount(tool('Edit a.ts', { old_string: 'same', new_string: 'same' }))).toBeNull()
    expect(changeCount(tool('Write a.ts', { content: '' }))).toBeNull()
  })

  it('모양이 아니면 세지 않는다', () => {
    expect(changeCount(tool('Bash ls', { command: 'ls' }))).toBeNull()
    expect(changeCount(tool('Edit a.ts', null))).toBeNull()
  })
})

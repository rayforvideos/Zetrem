import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { partsOf } from './answer'

function tool(line: string, at?: number): ToolActivity {
  return {
    line,
    toolUseId: null,
    input: null,
    result: null,
    startedAtMs: 0,
    endedAtMs: null,
    ...(at === undefined ? {} : { at }),
  }
}

function shape(text: string, tools: ToolActivity[]): (string | number)[] {
  return partsOf(text, tools).map((part) => (part.kind === 'text' ? part.text : part.tools.length))
}

describe('partsOf: an answer read back in the order it happened', () => {
  it('puts a tool between the words said before it and the words said after', () => {
    const before = '읽어 보겠습니다'
    expect(shape(`${before}\n\n고쳤습니다`, [tool('Read a.ts', before.length)])).toEqual([
      before,
      1,
      '고쳤습니다',
    ])
  })

  it('folds tools that ran at the same point into one run', () => {
    expect(shape('먼저', [tool('Read a.ts', 2), tool('Read b.ts', 2)])).toEqual(['먼저', 2])
  })

  it('opens a new run when words came between', () => {
    expect(shape('하나\n\n둘\n\n셋', [tool('A', 2), tool('B', 6)])).toEqual([
      '하나',
      1,
      '둘',
      1,
      '셋',
    ])
  })

  it('leaves a tool with no place recorded after all the text, as it was saved', () => {
    expect(shape('했습니다', [tool('Bash npm test')])).toEqual(['했습니다', 1])
  })

  it('draws no empty block for a tool used before any words', () => {
    expect(shape('', [tool('Bash ls', 0)])).toEqual([1])
    expect(shape('끝', [tool('Bash ls', 0)])).toEqual([1, '끝'])
  })

  it('keeps a place that points past the text inside it', () => {
    expect(shape('짧다', [tool('A', 99), tool('B', 1)])).toEqual(['짧다', 2])
  })

  it('is only the words when nothing was run', () => {
    expect(shape('그냥 대답', [])).toEqual(['그냥 대답'])
    expect(shape('', [])).toEqual([])
  })
})

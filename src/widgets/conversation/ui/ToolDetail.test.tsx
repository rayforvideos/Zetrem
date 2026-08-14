import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/pages/workspace/model/conversation'
import { ToolDetail } from './ToolDetail'

function tool(overrides: Partial<ToolActivity>): ToolActivity {
  return { line: 'Edit a.ts', toolUseId: 't1', input: null, result: null, ...overrides }
}

describe('ToolDetail — 도구마다 제 모양으로', () => {
  it('Edit 은 바뀐 줄을 +/- 로 보인다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Edit a.ts', input: { file_path: 'a.ts', old_string: 'const a = 1', new_string: 'const a = 2' } })} />,
    )
    expect(html).toContain('const a = 1')
    expect(html).toContain('const a = 2')
    expect(html).toContain('−')
    expect(html).toContain('+')
  })

  it('Write 는 새로 쓰는 내용을 전부 + 로 보인다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Write b.ts', input: { file_path: 'b.ts', content: 'hi' } })} />,
    )
    expect(html).toContain('hi')
    expect(html).toContain('+')
  })

  it('MultiEdit 은 바뀐 자리를 적용 순서대로 보인다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail
        tool={tool({
          line: 'MultiEdit a.ts',
          input: {
            file_path: 'a.ts',
            edits: [
              { old_string: '첫째 옛것', new_string: '첫째 새것' },
              { old_string: '둘째 옛것', new_string: '둘째 새것' },
            ],
          },
        })}
      />,
    )
    expect(html).toContain('첫째 옛것')
    expect(html).toContain('둘째 새것')
    expect(html.indexOf('첫째 새것')).toBeLessThan(html.indexOf('둘째 옛것'))
  })

  it('MultiEdit 의 모양이 틀리면 반환값 자체가 null 이다', () => {
    expect(ToolDetail({ tool: tool({ line: 'MultiEdit a.ts', input: { file_path: 'a.ts' } }) })).toBeNull()
    expect(ToolDetail({ tool: tool({ line: 'MultiEdit a.ts', input: { edits: '이상함' } }) })).toBeNull()
    expect(ToolDetail({ tool: tool({ line: 'MultiEdit a.ts', input: { edits: [] } }) })).toBeNull()
    expect(
      ToolDetail({ tool: tool({ line: 'MultiEdit a.ts', input: { edits: [{ old_string: 'x' }] } }) }),
    ).toBeNull()
    expect(
      ToolDetail({
        tool: tool({ line: 'MultiEdit a.ts', input: { edits: [{ old_string: '', new_string: '' }] } }),
      }),
    ).toBeNull()
  })

  it('TodoWrite 는 체크리스트로 서고 진행 중 하나가 드러난다', () => {
    const html = renderToStaticMarkup(
      <ToolDetail
        tool={tool({
          line: 'TodoWrite',
          input: {
            todos: [
              { content: '파서 쪼개기', status: 'completed' },
              { content: '상태줄 세우기', status: 'in_progress' },
              { content: 'diff 렌더', status: 'pending' },
            ],
          },
        })}
      />,
    )
    expect(html).toContain('파서 쪼개기')
    expect(html).toContain('상태줄 세우기')
    expect(html).toContain('✓')
    expect(html.match(/▸/g)).toHaveLength(1)
    expect(html).toContain('·')
    expect(html).toContain('line-through')
  })

  it('diff 도 40줄에서 멈추고 몇 줄이 남았는지 말한다', () => {
    const content = Array.from({ length: 100 }, (_, i) => `줄${i}`).join('\n')
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Write big.ts', input: { file_path: 'big.ts', content } })} />,
    )
    expect(html).toContain('줄39')
    expect(html).not.toContain('줄40')
    expect(html).toContain('… 60줄 더 있음')
  })

  it('전용 렌더가 없는 도구에는 아무것도 그리지 않는다', () => {
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'Bash ls', input: { command: 'ls' } })} />)).toBe('')
  })

  it('입력이 기대한 모양이 아니면 그리지 않는다 — 모르는 것을 지어내지 않는다', () => {
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'Edit a.ts', input: { file_path: 'a.ts' } })} />)).toBe('')
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'TodoWrite', input: { todos: '이상함' } })} />)).toBe('')
  })

  it('모양은 맞지만 내용이 비면 반환값 자체가 null 이다 — 눈금이 빈 패널을 열게 되면 안 된다', () => {
    expect(ToolDetail({ tool: tool({ line: 'TodoWrite', input: { todos: [] } }) })).toBeNull()
    expect(
      ToolDetail({ tool: tool({ line: 'TodoWrite', input: { todos: [{ status: 'pending' }] } }) }),
    ).toBeNull()
    expect(
      ToolDetail({ tool: tool({ line: 'Edit a.ts', input: { old_string: '', new_string: '' } }) }),
    ).toBeNull()
    expect(ToolDetail({ tool: tool({ line: 'Write b.ts', input: { content: '' } }) })).toBeNull()
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { TOOL_OUTPUT_LINES } from '../../lib/limits/limits'
import { ToolDetail } from './ToolDetail'

function tool(overrides: Partial<ToolActivity>): ToolActivity {
  return { line: 'Edit a.ts', toolUseId: 't1', input: null, result: null, startedAtMs: 0, endedAtMs: 100, ...overrides }
}

describe('ToolDetail: each tool drawn in its own shape', () => {
  it('shows an edit as added and removed lines', () => {
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Edit a.ts', input: { file_path: 'a.ts', old_string: 'const a = 1', new_string: 'const a = 2' } })} />,
    )
    expect(html).toContain('const a = 1')
    expect(html).toContain('const a = 2')
    expect(html).toContain('−')
    expect(html).toContain('+')
  })

  it('shows a write as all additions', () => {
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Write b.ts', input: { file_path: 'b.ts', content: 'hi' } })} />,
    )
    expect(html).toContain('hi')
    expect(html).toContain('+')
  })

  it('shows a multi-edit in the order the changes apply', () => {
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

  it('returns nothing at all when a multi-edit is the wrong shape', () => {
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

  it('draws a todo list and marks the one in progress', () => {
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

  it('stops a diff at the cap and counts what was cut, rather than hiding it', () => {
    const over = TOOL_OUTPUT_LINES + 60
    const content = Array.from({ length: over }, (_, i) => `줄${i}`).join('\n')
    const html = renderToStaticMarkup(
      <ToolDetail tool={tool({ line: 'Write big.ts', input: { file_path: 'big.ts', content } })} />,
    )
    expect(html).toContain(`줄${TOOL_OUTPUT_LINES - 1}`)
    expect(html).not.toContain(`줄${TOOL_OUTPUT_LINES}<`)
    expect(html).toContain('… 60 more lines')
  })

  it('draws nothing for a tool with no view of its own', () => {
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'Bash ls', input: { command: 'ls' } })} />)).toBe('')
  })

  it('draws nothing when the input is not the shape it expects', () => {
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'Edit a.ts', input: { file_path: 'a.ts' } })} />)).toBe('')
    expect(renderToStaticMarkup(<ToolDetail tool={tool({ line: 'TodoWrite', input: { todos: '이상함' } })} />)).toBe('')
  })

  it('returns nothing when the shape is right but the content is empty, so no empty panel opens', () => {
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

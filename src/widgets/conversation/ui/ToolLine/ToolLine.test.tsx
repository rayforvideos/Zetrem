import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ToolActivity } from '@/entities/conversation'
import { ToolLine } from './ToolLine'

const PROJECT = '/work/app'

function tool(line: string, overrides: Partial<ToolActivity> = {}): ToolActivity {
  return {
    line,
    toolUseId: line,
    input: null,
    result: null,
    startedAtMs: 0,
    endedAtMs: 100,
    ...overrides,
  }
}

function draw(tool: ToolActivity, project: string | null = PROJECT): string {
  return renderToStaticMarkup(<ToolLine tool={tool} project={project} />)
}

describe('a tool row shows a path the way the project speaks it', () => {
  it('leaves off the project root, which is the same on every row', () => {
    const html = draw(
      tool('Read /work/app/src/entities/tool/index.ts', {
        input: { file_path: '/work/app/src/entities/tool/index.ts' },
      }),
    )
    expect(html).toContain('src/entities/tool/')
    expect(html).not.toContain('/work/app')
  })

  it('keeps a path from outside the project whole', () => {
    const html = draw(tool('Read /etc/hosts', { input: { file_path: '/etc/hosts' } }))
    expect(html).toContain('/etc/')
  })
})

describe('a teammate call is not another shell command', () => {
  it('sets the row a step above a tool row', () => {
    const html = draw(
      tool('Agent look', { input: { subagent_type: 'claude', description: 'look' } }),
    )
    expect(html).toContain('font-medium')
    expect(html).toContain('text-sm')
  })

  it('leaves a tool row in the monospace it shares with its output', () => {
    const html = draw(tool('Bash ls', { input: { command: 'ls' } }))
    expect(html).not.toContain('font-medium')
  })
})

describe('a failed row says what went wrong', () => {
  it('shows the complaint, not how many lines it took', () => {
    const html = draw(
      tool('Read /work/app/a.ts', {
        input: { file_path: '/work/app/a.ts' },
        result: {
          stdout: 'File does not exist.',
          stderr: '',
          isError: true,
          interrupted: false,
        },
      }),
    )
    expect(html).toContain('data-failed')
    expect(html).toContain('File does not exist.')
    expect(html).not.toContain('1 line')
  })
})

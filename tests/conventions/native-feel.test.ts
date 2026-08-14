import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

async function css(): Promise<string> {
  return readFile(join('src', 'app', 'styles', 'global.css'), 'utf8')
}

describe('it behaves like a native app', () => {
  it('puts a pointer cursor on anything pressable, which Tailwind v4 does not do for us', async () => {
    const text = await css()
    const rule = text.slice(text.indexOf('button,'), text.indexOf('cursor: pointer'))
    expect(rule, '버튼과 메뉴·스위치·탭이 한 규칙에 묶여야 한다').toContain("[role='switch']")
    expect(text).toContain('cursor: pointer')
  })

  it('takes the pointer off what cannot be pressed, since looking pressable would be a lie', async () => {
    expect(await css()).toMatch(/button:disabled[^}]*cursor: default/s)
  })

  it('does not let the surface be dragged, and only lets text be selected where it is read', async () => {
    const text = await css()
    expect(text).toMatch(/body\s*\{[^}]*user-select: none/s)
    expect(text).toMatch(/\[data-selectable\][^{]*\{[^}]*user-select: text/s)
  })

  it('does not bounce the window and show what is behind it', async () => {
    expect(await css()).toContain('overscroll-behavior: none')
  })

  it('does not let images or the wordmark be dragged out of the window', async () => {
    expect(await css()).toContain('-webkit-user-drag: none')
  })
})

describe('what is meant to be read can be selected, and nothing else', () => {
  it('marks only the conversation, the report and the session details as selectable', async () => {
    const marked: string[] = []
    async function walk(dir: string): Promise<void> {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) await walk(full)
        else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
          if ((await readFile(full, 'utf8')).includes('data-selectable')) marked.push(entry.name)
        }
      }
    }
    await walk(join('src', 'widgets'))
    expect(marked.sort()).toEqual([
      'AgentReport.tsx',
      'Approval.tsx',
      'ConversationPane.tsx',
      'SetupPane.tsx',
      'StatusDrawer.tsx',
      'ToolDetail.tsx',
    ])
  })
})
